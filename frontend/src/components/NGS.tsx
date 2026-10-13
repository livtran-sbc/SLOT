import SampleChecklist from "./SampleChecklist";
import { CreateTable } from "./CreateTable";
import { useTabData } from "./TabInputContext";

export default function NGS() {
  const { tabInputs } = useTabData();
  const tab = tabInputs["ngsTab"];

  return (
    <>
      <div className="header-wrapper">
        <h4 id="tab-specific-wrapper">NGS Tray Verification</h4>
        <SampleChecklist tabNum="ngsTab" />
      </div>
      {tab.returnedData && <div className="divider"></div>}
      <div className="summary-section-style">
        {tab.returnedData && (
          <>
            <h3 style={{ margin: "20px 0px" }}>
              NGS Sample Setup Check Results
            </h3>
            <CreateTable data={tab.returnedData} checkTable={true} />
          </>
        )}
      </div>
    </>
  );
}
