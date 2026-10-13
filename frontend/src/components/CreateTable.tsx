import { useRef } from "react";
import {
  CreateTableProps,
  TableDataContentTypes,
  TabStateTypes,
} from "./types";

export const parseTXT = (text: string) => {
  const lines = text.trim().split("\n");
  return lines.map((line) => line.split(",").map((cell) => cell.trim()));
};

export const createDataArray = (
  text: string,
  tabName: TabStateTypes,
  numOfSamples: number,
) => {
  let rows = parseTXT(text);

  // parse uploaded micronic output file to only number of samples specified by user
  // micronic output for freezer location assignment AND verify tube location is HORIZONTAL
  // A01, A02, A03... micronic file will not be populated in order
  // all other micronic outputs will be VERTICAL and WILL be populated in order
  // A01, B01, C01...

  if (numOfSamples) {
    //sort micronic output before slicing
    if (tabName === "flTab" || tabName === 'vtTab') {
      rows.sort((a, b) => a[0].localeCompare(b[0]));
    }

    rows = rows.slice(0, numOfSamples);
  }

  let headers = ["location", "micronic code"];

  if (tabName === "mcTab") {
    //txt file has comma at end
    rows.map((row) => row.push("".repeat(1)));

    headers.push("extraction number");
    //headers = ["location", "micronic code", "extraction number"];
  }

  // micronic output for freezer location assignment is HORIZONTAL
  // A01, A02, A03... micronic file will not be populated in order
  if (tabName === "flTab") {
  }

  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
};

export function CreateTable({
  data,
  handleChange,
  micronicCodeTable = false,
  editableColumns = ["extraction number"],
  checkTable = false,
}: CreateTableProps) {
  //edited updates
  const onDataChange = (idx: number, header: string, value: string) => {
    const newData = [...(data as TableDataContentTypes)];
    newData[idx] = {
      ...newData[idx],
      [header]: value,
    };
    handleChange?.(newData);
  };

  const headers = (data as Record<string, unknown>[]) && Object.keys(data[0]);
  const anyMCmissing = micronicCodeTable
    ? (data as TableDataContentTypes).some((row) => !row["micronic code"])
    : false;
  //disabled editable fields if linked status appears (i.e. already underwent processing)
  const disabledEditableFields = micronicCodeTable
    ? "linked" in (data as TableDataContentTypes)[0]
      ? true
      : false
    : false;

  //used to keep track of the reference index so +1 can be added every time a barcode is scanned
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <>
      {data !== "" && (
        <table className="table-styles">
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th key={i}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data as Record<string, unknown>[]).map((row, idx) => (
              <tr key={idx}>
                {headers.map((header) => (
                  <td
                    key={header}
                    className={
                      (!editableColumns.includes(header) && !row[header]) ||
                      (checkTable && row[header] === "FALSE") ||
                      (checkTable && row[header] === "NOT FOUND!!!")
                        ? "missing"
                        : ""
                    }
                  >
                    {editableColumns.includes(header) ? (
                      micronicCodeTable ? (
                        row["micronic code"] ? (
                          <input
                            className={`table-input ${anyMCmissing || disabledEditableFields ? "disabled" : ""}`}
                            value={(row[header] as string) ?? ""}
                            onChange={(e) =>
                              onDataChange(idx, header, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                inputRefs.current[idx + 1]?.focus();
                              }
                            }}
                            ref={(el) => {
                              inputRefs.current[idx] = el;
                            }}
                            disabled={anyMCmissing || disabledEditableFields}
                          />
                        ) : (
                          ""
                        )
                      ) : (
                        ((row[header] as React.ReactNode) ?? "")
                      )
                    ) : (
                      (row[header] as React.ReactNode) || "MISSING"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
