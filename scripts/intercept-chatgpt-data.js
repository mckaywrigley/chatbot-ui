// ==UserScript==
// @name         Intercept ChatGPT
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Download ChatGPT conversation data from chat.openai.com/chat
// @author
// @match        https://chat.openai.com/chat/*
// @match        https://chat.openai.com/chat
// @match        https://chat.openai.com/chat?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

(function () {
  let loggedData = [];
  let maxAgeInDays = null;
  const exportButtonId = 'export-data-button';

  // Save data to a file
  function saveToFile() {
    const fileBlob = new Blob([JSON.stringify(loggedData, null, 2)], {
      type: 'application/json',
    });
    const fileURL = URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = fileURL;
    link.download = `chatgpt-data-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function addInterceptedData(data) {
    loggedData.push(data);
    console.log(data);

    // Update the "Save Intercepted Data" button text
    const exportButton = document.getElementById(exportButtonId);
    if (exportButton) {
      exportButton.textContent = `Harvest and Export (${loggedData.length})`;
    } else {
      console.error('No export button found!');
    }
  }

  // Intercept XMLHttpRequest
  const originalXMLHttpRequestOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (url.includes('/conversation/')) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4) {
          const requestData = {
            type: 'xhr',
            url,
            response: JSON.parses(this.response),
          };
          addInterceptedData(requestData);
        }
      });
    }
    return originalXMLHttpRequestOpen.apply(this, arguments);
  };

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function (url, options) {
    if (url.includes('/conversation/')) {
      const response = await originalFetch.apply(this, arguments);
      const responseClone = response.clone(); // clone the response so it can still be used by the website

      responseClone.text().then((responseData) => {
        const requestData = {
          type: 'fetch',
          url,
          response: JSON.parse(responseData),
        };
        addInterceptedData(requestData);
      });

      return response;
    } else {
      return originalFetch.apply(this, arguments);
    }
  };

  function getMaxAgeInDays() {
    // Prompt the user to enter a number
    const enteredValue = prompt(
      "How many days of data do you want to gather? (enter no value for 'all days')",
    );
    if (enteredValue === null) {
      // User clicked cancel
      return false;
    }

    // Check if the entered value is a valid integer
    if (!isNaN(parseFloat(enteredValue)) && isFinite(enteredValue)) {
      maxAgeInDays = parseFloat(enteredValue);
    } else {
      maxAgeInDays = null;
    }
    return true;
  }

  function hasInterceptedOldEntry() {
    if (!maxAgeInDays) {
      return false;
    }
    const maxAgeDaysAgo = new Date();
    maxAgeDaysAgo.setDate(maxAgeDaysAgo.getDate() - maxAgeInDays);

    return loggedData.some((entry) => {
      const updateTime = new Date(entry.response.update_time * 1000);
      return updateTime < maxAgeDaysAgo;
    });
  }

  function clickLink(link) {
    link.focus(); // Focus the link before clicking it
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    link.dispatchEvent(clickEvent);
  }

  // Function to click links within the div with the class "scrollbar-trigger"
  async function harvestAndExport() {
    if (!getMaxAgeInDays()) {
      return;
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const excludedTexts = [
      'New chat',
      'Clear conversations',
      'Light mode',
      'My account',
      'Updates & FAQ',
      'Log out',
    ];

    async function clickShowMore() {
      let showMoreDiv = [...document.querySelectorAll('div')].find(
        (div) => div.textContent.trim() === 'Show more',
      );

      if (showMoreDiv) {
        showMoreDiv.click();
        await delay(3000);
        return true;
      } else {
        return false;
      }
    }

    let skip = 0;
    let done = false;
    while (true) {
      const container = document.querySelector('.scrollbar-trigger');

      if (container) {
        const flexColDiv = container.querySelector('.flex-col');
        if (flexColDiv) {
          const links = flexColDiv.querySelectorAll('a');
          const filteredLinks = [...links].filter((link) => {
            return !excludedTexts.some((excludedText) =>
              link.textContent
                .toLowerCase()
                .includes(excludedText.toLowerCase()),
            );
          });

          let i = -1;
          let anyProcessed = false;
          for (const link of filteredLinks) {
            i++;
            if (i < skip) {
              continue;
            }
            console.log('Scrolling to anchor: ' + link.textContent + '...');

            //link.scrollTo();
            clickLink(link);
            anyProcessed = true;
            await delay(3000); // Wait for 3 seconds before clicking the next link

            // There are 20 items in the list every time we click "show more".
            if (i > 0 && i % 18 === 0) {
              await clickShowMore();
            }

            // Check if loggedData has any entry older than the requested max age
            if (hasInterceptedOldEntry()) {
              done = true;
              break; // Stop processing further links
            }

            skip++;
            break;
          }
          if (!anyProcessed || done) {
            break;
          }
        } else {
          console.error('Cannot find the div with the class "flex-col".');
        }
      } else {
        console.error(
          'Cannot find the div with the class "scrollbar-trigger".',
        );
      }
    }

    saveToFile();
  }

  // Add a button to trigger the harvestAndExport function
  const exportButton = document.createElement('button');
  exportButton.id = exportButtonId;
  exportButton.textContent = 'Harvest & Export';
  exportButton.style.position = 'fixed';
  exportButton.style.top = '10px';
  exportButton.style.right = '10px';
  exportButton.style.zIndex = '9999';
  exportButton.style.padding = '10px 20px'; // Add padding for a better look
  exportButton.style.fontSize = '16px'; // Increase font size
  exportButton.style.fontWeight = 'bold'; // Bold font
  exportButton.style.color = '#ffffff'; // Set font color to white
  exportButton.style.backgroundColor = '#4CAF50'; // Set background color to a greenish tone
  exportButton.style.border = 'none'; // Remove default border
  exportButton.style.borderRadius = '4px'; // Add rounded corners
  exportButton.style.cursor = 'pointer'; // Change cursor to pointer when hovering
  exportButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.25)'; // Add a subtle box shadow
  exportButton.style.transition = 'background-color 0.2s'; // Add transition for hover effect

  exportButton.onmouseover = function () {
    this.style.backgroundColor = '#45a049'; // Change background color on hover
  };

  exportButton.onmouseout = function () {
    this.style.backgroundColor = '#4CAF50'; // Revert background color on mouse out
  };

  exportButton.onclick = harvestAndExport;
  document.body.appendChild(exportButton);
})();
