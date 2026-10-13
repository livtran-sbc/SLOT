import { TextInputTabs, InputButton } from "./InputComponents";
import { useTabData } from "./TabInputContext";
import { useErrorModal, ErrorModal, ErrorMessage } from "./ErrorComponents";
import { Check } from "lucide-react";

export default function FBBarcodeAssignment() {
  const { tabInputs, updateTabInputs, resetButton, selectedPanel } =
    useTabData()!;
  const tabNum = "fbTab";
  const { show, message, showError, hideError } = useErrorModal();
  const boxes = tabInputs[tabNum].allBoxes;

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTabInputs(tabNum, { barcode: e.target.value });
  };

  const handleAssignFBBarcode = async () => {
    try {
      const response = await fetch("/api/assign-fb-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freezer_box_table:
            selectedPanel === "Genomic DNA"
              ? "gdna_freezer_boxes"
              : "chi_freezer_boxes",
          entered_barcode: tabInputs[tabNum].barcode,
        }),
      });

      // error handling
      if (!response.ok) {
        const error = await response.json(); 
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      }

      const data = await response.json();

      updateTabInputs(tabNum, {
        allBoxes: data.boxInfo,
        lastBox: data.lastBox,
        assignClicked: true,
      });
    } catch (error) {
      const typedError = error as { status: number; message: string };
      console.log(error);
      showError(
        <ErrorMessage
          process="Freezer Box Barcode Assignment"
          error={typedError}
        />,
      );
    }
  };

  return (
    <div className="fb-barcode-wrapper">
      <TextInputTabs
        label="fb-barcode"
        title="Freezer Box Barcode"
        value={tabInputs[tabNum].barcode}
        handleChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleBarcodeInput(e)
        }
        textboxStyle="fb-assignment-input"
        heading={true}
        style="center"
      />
      <div className="text-input-wrapper">
        <InputButton
          label="Assign Barcode"
          style="enter-button fb-assignment"
          disabled={
            tabInputs[tabNum].barcode === "" || tabInputs[tabNum].assignClicked
          }
          handleClick={() => handleAssignFBBarcode()}
        />
        <InputButton
          label="Reset"
          style="reset-button fb-assignment"
          handleClick={() => resetButton("fbTab")}
        />
      </div>

      {show && <ErrorModal message={message} onClose={hideError} />}
      {boxes && <div className="divider"></div>}
      <div className="fb-assignment-results-section">
        {boxes && (
          <>
            <div className="grid">
              <div className="previous-box">
                <h3 style={{ textAlign: "center" }}>Previous Box</h3>
                <div className="box-label side">{boxes.previousBox[0]}</div>
                <div className="box-label-barcode">
                  Barcode # {boxes.previousBox[1]}
                </div>
              </div>
              <div className="current-box">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  Assigned!
                  <Check />
                </div>
                <h3>Current Box</h3>
                <div className="box-label current">{boxes.currentBox[0]}</div>
                <div className="box-label-barcode">
                  Barcode # {boxes.currentBox[1]}
                </div>
              </div>
              <div className="future-box">
                <h3 style={{ textAlign: "center" }}>Future Box</h3>
                <div className="box-label side">{boxes.futureBox}</div>
              </div>
            </div>
            {tabInputs[tabNum].lastBox !== "" && (
              <div style={{ fontSize: "1.5rem" }}>
                {tabInputs[tabNum].lastBox}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
