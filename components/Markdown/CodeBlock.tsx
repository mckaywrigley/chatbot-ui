import { generateRandomString, programmingLanguages } from "@/utils/app/codeblock";
import { IconDownload } from "@tabler/icons-react";
import { FC, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface Props {
  language: string;
  value: string;
  lightMode: "light" | "dark";
}

export const CodeBlock: FC<Props> = ({ language, value, lightMode }) => {
  const [buttonText, setButtonText] = useState("Copy code");

  const copyToClipboard = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setButtonText("Copied!");

      setTimeout(() => {
        setButtonText("Copy code");
      }, 2000);
    });
  };
  const downloadAsFile = () => {
    const fileExtension = programmingLanguages[language] || ".file";
    const suggestedFileName = `file-${generateRandomString(3, true)}${fileExtension}`;
    const fileName = window.prompt("Enter file name", suggestedFileName);

    if (!fileName) {
      // user pressed cancel on prompt
      return;
    }

    const blob = new Blob([value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="relative text-[16px]">
      <div className="flex items-center justify-end">
        <button
          className="text-white bg-none py-0.5 px-2 rounded focus:outline-none hover:bg-blue-700 text-xs"
          onClick={copyToClipboard}
        >
          {buttonText}
        </button>
        <button
          className="text-white bg-none py-0.5 px-2 rounded focus:outline-none hover:bg-blue-700 text-xs"
          onClick={downloadAsFile}
        >
          <IconDownload size={16} />
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={lightMode === "light" ? oneLight : oneDark}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
