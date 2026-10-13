import { Upload } from "lucide-react";
import {
  InputButtonProps,
  TextInputTabsProps,
  FileUploaderProps,
  SampleNumberInputProps,
  TextInputQueryProps,
  VisibleFileUploaderProps,
} from "./types";

// text input components for UI in TABS
export function TextInputTabs({
  label,
  title,
  value,
  handleChange,
  style = "",
  textboxStyle = "",
  heading = false,
  disabled = false,
}: TextInputTabsProps) {
  return (
    <div className={`text-input ${style}`}>
      {heading ? (
        <h4 style={{ marginBottom: "15px" }}>{title}</h4>
      ) : (
        <label htmlFor={label}>{title}</label>
      )}
      <input
        type="text"
        name={label}
        value={value!}
        className={`text-input-box ${textboxStyle}`}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}

export function SampleNumberInput({
  value,
  tabNum,
  handleEnter,
  title,
  style = "",
  heading = false,
  disabled = false,
  textboxStyle = "",
}: SampleNumberInputProps) {
  return (
    <TextInputTabs
      label="num-samples"
      title={title}
      value={value}
      handleChange={(e) => handleEnter(e, tabNum, "numSamples")}
      textboxStyle={textboxStyle}
      heading={heading}
      style={style}
      disabled={disabled}
    />
  );
}

//text input components for UI in QUERY DATABASE
export function TextInputQuery({
  label,
  title,
  value,
  updateInputs,
  disabled = false,
}: TextInputQueryProps) {
  return (
    <div className={`text-input ${disabled == true ? "disabled" : ""}`}>
      <label htmlFor={label}>{title}</label>
      <input
        type="text"
        name={label}
        value={value}
        className="text-input-box"
        onChange={updateInputs}
        disabled={disabled}
      />
    </div>
  );
}

export function VisibleFileUploader({
  fileName,
  id,
  style,
  disabled = false,
}: VisibleFileUploaderProps) {
  
  return (
    <div className="visible-file-upload">
      <label
        htmlFor={id}
        className={`file-input-style ${style} ${disabled ? "disabled" : ""}`}
      >
        {<Upload />}Choose File
      </label>
      {fileName !== "No file chosen" && (
        <span
          className={`file-chosen-text ${style} ${disabled ? "disabled" : ""}`}
        >
          {fileName}
        </span>
      )}
    </div>
  );
}

// file uploader
export function FileUploader({
  onUpload,
  id,
  action,
  uploadType,
  tabNum,
  fileRef,
  disabled,
}: FileUploaderProps) {
  return (
    <div className="file-upload">
      <input
        type="file"
        accept={
          uploadType === "micronic"
            ? ".txt"
            : id === "ttx-uploader"
              ? ".ttx"
              : ".csv"
        }
        id={id}
        style={{ display: "none" }}
        ref={(el) => {
          fileRef.current[tabNum] = el;
        }}
        onChange={(e) => onUpload(e, tabNum, uploadType, action)}
        disabled={disabled}
      />
    </div>
  );
}

export function InputButton({
  label,
  style,
  handleClick,
  disabled = false,
}: InputButtonProps) {
  return (
    <button
      className={`input-button ${style}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
