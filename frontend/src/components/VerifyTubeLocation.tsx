// VERIFY TUBE LOCATION //
// function to verify tube locations based on scanned in micronic outputs
// genomic DNA = sample location verification and SSO + NGS sample set up checks
// chi = sample location verification only

import SampleChecklist  from "./SampleChecklist";
import { CreateTable } from "./CreateTable";
import { useTabData } from "./TabInputContext";

export default function VerifyTubeLocation() {
  const { tabInputs } = useTabData()!;
  const tab = tabInputs["vtTab"];

  return (
    <>
      <div className="header-wrapper">
        <h4 id="tab-specific-wrapper">Verify Tube Location Checklist</h4>
        <SampleChecklist tabNum="vtTab" />
      </div>
      
      {tab.returnedData && <div className="divider"></div>}
      <div className="summary-section-style">
        {
          // return assignment summary
          tab.returnedData && (
            <>
              <h3 style={{ margin: "20px 0px" }}>
                Verify Tube Location Results
              </h3>
              <CreateTable data={tab.returnedData} checkTable={true} />
            </>
          )
        }
        
      </div>
    </>
  );
}
