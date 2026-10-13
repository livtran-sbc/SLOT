import { TextInputQuery, InputButton } from "./InputComponents";
import { useTabData } from "./TabInputContext";
import { CreateTable } from "./CreateTable";

import { useErrorModal, ErrorMessage, ErrorModal } from "./ErrorComponents";

import { SearchX } from "lucide-react";

const queryTitles = {
  "None selected": "None selected",
  "Extraction #": "Extraction Number",
  "Box Barcode #": "Box Barcode Number",
  "Sample #": "Sample Number",
};

const tabNum = "queryDBTab";

export default function QueryDatabase() {
  const {
    tabInputs,
    updateTabInputs,
    resetButton,
    selectedPanel,
    handleEnter,
  } = useTabData()!;

  const { show, message, showError, hideError } = useErrorModal();

  const queryDatabase = async () => {
    updateTabInputs(tabNum, { enterClicked: true });

    try {
      //append
      const params = new URLSearchParams({
        query_type: tabInputs[tabNum].selected,
        input: tabInputs[tabNum].inputValue,
        sample_type: selectedPanel,
      });

      const response = await fetch(`/api/query-db?${params}`);

      if (response.ok) {
        const data = await response.json();
        updateTabInputs(tabNum, { returnedData: data.table });
      } else {
        const error = await response.json();
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      }
    } catch (error) {
      console.log(error);

      const typedError = error as { status: number; message: string };

      showError(<ErrorMessage process="Query Database" error={typedError} />);
    }
  };

  return (
    <div className="query-db-wrapper">
      <div className="query-dropdown">
        <label htmlFor="query-type" className="query-label">
          Query Type
        </label>
        <select
          name="query"
          id="query-type"
          value={tabInputs[tabNum].selected}
          onChange={(e) => {
            updateTabInputs(tabNum, {
              selected: e.target.value,
              returnedData: null,
              inputValue: "",
              enterClicked: false,
            });
          }}
        >
          {Object.keys(queryTitles)
            .filter(
              (opt) => !(selectedPanel === "Genomic DNA" && opt === "Sample #"),
            )
            .map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
        </select>
      </div>

      {tabInputs[tabNum].selected !== "None selected" ? (
        <div className="text-input-wrapper query">
          <TextInputQuery
            value={tabInputs[tabNum].inputValue}
            label="query-selection"
            title={queryTitles[tabInputs[tabNum].selected]}
            updateInputs={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleEnter(e, tabNum, "inputValue")
            }
            disabled={tabInputs[tabNum].enterClicked}
          />

          <div className="input-button-wrapper">
            <InputButton
              label="Enter"
              style="enter-button"
              handleClick={() => queryDatabase()}
              disabled={tabInputs[tabNum].enterClicked}
            />
            <InputButton
              label="Reset"
              style="reset-button"
              handleClick={() => resetButton(tabNum)}
            />
          </div>
        </div>
      ) : null}

      {tabInputs[tabNum].returnedData !== null && (
        <div className="db-table-wrapper">
          <div className="db-table">
            <h3 style={{ textAlign: "center", marginBottom: "30px" }}>
              {queryTitles[tabInputs[tabNum].selected] + " "}{" "}
              <span style={{ fontSize: "1.5rem", color: "#007bff" }}>
                {tabInputs[tabNum].inputValue}
              </span>
            </h3>
            {tabInputs[tabNum].returnedData != "No results returned" ? (
              <CreateTable data={tabInputs[tabNum].returnedData} />
            ) : (
              <div className="db-no-results">
                <SearchX size={50} color={"grey"} />
                <h4>
                  No records returned! Please verify the provided input and try
                  again.
                </h4>
              </div>
            )}
          </div>
        </div>
      )}
      {show && <ErrorModal message={message} onClose={hideError} />}
    </div>
  );
}
