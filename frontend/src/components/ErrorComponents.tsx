import { useState } from "react";
import { OctagonAlert, ChevronDown, ChevronRight } from "lucide-react";

import { ErrorModalProps, ErrorDetailsProps, ErrorMessageProps } from "./types";

export function ErrorModal({ message, onClose }: ErrorModalProps) {
  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <OctagonAlert stroke="red" strokeWidth="2" width="10%" height="10%" />
          <div>{message}</div>
          <button onClick={() => onClose()}>Close</button>
        </div>
      </div>
    </>
  );
}

export function ErrorDetails({ errorType, content }: ErrorDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        className="error-details-button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown /> : <ChevronRight />}
        {errorType}
      </button>
      {expanded && (<div className="error-details-table"> {content}</div>)}
    </>
  );
}

export function useErrorModal() {
  const [show, setShow] = useState<boolean>(false);
  const [message, setMessage] = useState<React.ReactNode|string>("");

  const showError = (error: React.ReactNode | string) => {
    setShow(true);
    setMessage(error);
  };

  const hideError = () => {
    setShow(false);
    setMessage("");
  };

  return { show, message, showError, hideError };
}

export const ErrorMessage = ({ process, error }: ErrorMessageProps) => {
  return (
    <>
      <h5>{process} failed!</h5>
      <span style={{ fontSize: "1.2em" }}>
        <div>
          Status code: <b>{error.status ?? "NA"}</b>
        </div>
        <div>
          {" "}
          Error details:{" "}
          <span style={{ backgroundColor: "yellow" }}>{error.message}</span>
        </div>
      </span>
    </>
  );
};
