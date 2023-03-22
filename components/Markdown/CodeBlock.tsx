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
    navigator.clipboard.writeText(value).then(() => {
      setButtonText("Copied!");

      setTimeout(() => {
        setButtonText("Copy code");
      }, 2000);
    });
  };

  return (
    <div className="relative text-[16px] pt-2">
      <SyntaxHighlighter
        language={language}
        style={lightMode === "light" ? oneLight : oneDark}
      >
        {value}
      </SyntaxHighlighter>

      <button
        className="absolute top-[-8px] right-[0px] text-white bg-none py-0.5 px-2 rounded focus:outline-none hover:bg-blue-700 text-xs"
        onClick={copyToClipboard}
      >
        {buttonText}
      </button>
    </div>
  );
};
