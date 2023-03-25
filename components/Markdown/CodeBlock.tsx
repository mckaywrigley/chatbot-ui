import { generateRandomString, programmingLanguages } from "@/utils/app/codeblock";
import { IconCheck, IconClipboard, IconDownload } from "@tabler/icons-react";
import { FC, useState } from "react";
import { useTranslation } from "next-i18next";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface Props {
  language: string;
  value: string;
  lightMode: "light" | "dark";
}

export const CodeBlock: FC<Props> = ({ language, value, lightMode }) => {
  const { t } = useTranslation('markdown');
  const [isCopied, setIsCopied] = useState<Boolean>(false);

  const copyToClipboard = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };
  const downloadAsFile = () => {
    const fileExtension = programmingLanguages[language] || ".file";
    const suggestedFileName = `file-${generateRandomString(3, true)}${fileExtension}`;
    const fileName = window.prompt(t("Enter file name") || '', suggestedFileName);

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
    <div className="codeblock relative text-[16px] font-sans">
      <div className="flex items-center justify-between py-1.5 px-4">
        <span className="text-xs text-white lowercase">{language}</span>
        <div className="flex items-center">
          <button
            className="text-white bg-none py-0.5 px-2 rounded focus:outline-none text-xs flex items-center"
            onClick={copyToClipboard}
          >
            {isCopied ? <IconCheck size={18} className="mr-1.5"/> : <IconClipboard size={18} className="mr-1.5"/>}
            {isCopied ? t("Copied!") : t("Copy code")}
          </button>
          <button
            className="text-white bg-none py-0.5 pl-2 rounded focus:outline-none text-xs flex items-center"
            onClick={downloadAsFile}
          >
            <IconDownload size={18} />
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        language={language}
        style={lightMode === "light" ? oneLight : oneDark}
        customStyle={{margin: 0}}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
