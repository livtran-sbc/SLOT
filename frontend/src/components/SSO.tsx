import SampleChecklist from "./SampleChecklist";
import { CreateTable } from "./CreateTable";
import { useTabData } from "./TabInputContext";

export default function SSO() {
  const { tabInputs } = useTabData()!;
  const tab = tabInputs["ssoTab"];

  return (
    <>
      <div className="header-wrapper">
        <h4 id="tab-specific-wrapper">SSO Setup</h4>
        <SampleChecklist tabNum="ssoTab" />
      </div>
      {tab.returnedData && <div className="divider"></div>}
      <div className="summary-section-style">
        {tab.returnedData && (
          <>
            <h3 style={{ margin: "20px 0px" }}>
              SSO Sample Setup Check Results
            </h3>
            <CreateTable data={tab.returnedData} checkTable={true} />
          </>
        )}
      </div>
    </>
  );
}
