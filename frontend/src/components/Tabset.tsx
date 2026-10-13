import MCAssignment from "./MCAssignment";
import FBBarcodeAssignment from "./FBBarcodeAssignment";
import FreezerLocationAssignment from "./FreezerLocationAssignment";
import VerifyTubeLocation from "./VerifyTubeLocation";
import QueryDatabase from "./QueryDatabase";
import SSO from "./SSO";
import NGS from "./NGS";

import { TabsetProps, TabTypes } from "./types";

const commonTabs: TabTypes[] = [
  "Assign MC",
  "Assign Location",
  "Verify Location",
  "Assign Box BC",
  "Query DB"
];

export default function Tabset({
  activeTab,
  setActiveTab,
  panel,
}: TabsetProps) {

  const tabs: TabTypes[] = panel === "Genomic DNA" ? [...commonTabs, "NGS", "SSO"] : commonTabs;

  return (
    <div className="tab-panel-wrapper">
      <div className="tab-panel">
        {tabs.map((tab, idx) => (
          <div key={idx}>
            <button
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          </div>
        ))}
      </div>

      <div className={`tab-content ${activeTab === 'Query DB' ? '' : 'flex'}`}>
        {/* micronic code assignment tab */}
        {activeTab === "Assign MC" && <MCAssignment />}

        {/* freezer location assignment tab*/}
        {activeTab === "Assign Location" && (
          <FreezerLocationAssignment />
        )}

        {/* verify tube location tab */}
        {activeTab === "Verify Location" && <VerifyTubeLocation />}

        {/* freezer box barcode assignment tab */}
        {activeTab === "Assign Box BC" && <FBBarcodeAssignment />}

        {activeTab === "Query DB" && <QueryDatabase />}
        {/* GENOMIC DNA ONLY!!!!!!!!!!!!!!!!!!!!!!!! */}

        {activeTab === "SSO" && <SSO />}
        {activeTab === "NGS" && <NGS />}
      </div>
    </div>
  );
}
