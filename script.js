function parseXML(xmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, "text/xml");
}

function extractConditions(xml) {
    const conditions = [];
    const receiverRules = xml.getElementsByTagName("ReceiverRule");

    for (let rule of receiverRules) {
        const component = rule.getElementsByTagName("ComponentID")[0]?.textContent || "Unknown";
        let conditionStrings = [];

        const conditionBlocks = rule.getElementsByTagName("AtomicConditionBlock");
        for (let block of conditionBlocks) {
            let blockConditions = [];

            const atomicConditions = block.getElementsByTagName("AtomicCondition");
            for (let cond of atomicConditions) {
                const left = cond.getElementsByTagName("LeftExtractor")[0]?.getElementsByTagName("Value")[0]?.textContent;
                const operator = cond.getElementsByTagName("Operator")[0]?.textContent;
                const right = cond.getElementsByTagName("RightExtractor")[0]?.getElementsByTagName("Value")[0]?.textContent;

                if (left && operator) {
                    let formattedOperator = operator === 'EQ' ? '=' : operator === 'NE' ? '≠' : '≈';
                    let formattedCondition = `${left} ${formattedOperator} ${right || ''}`;
                    blockConditions.push(formattedCondition);
                }
            }

            if (blockConditions.length) {
                conditionStrings.push(blockConditions.join(" AND "));
            }
        }

        if (conditionStrings.length) {
            conditions.push({ component, condition: conditionStrings.join(" OR ") });
        }
    }
    return conditions;
}

function compareXML() {
    const devXMLString = document.getElementById("devXML").value.trim();
    const prodXMLString = document.getElementById("prodXML").value.trim();

    if (!devXMLString || !prodXMLString) {
        alert("Please paste both Dev and Prod XML contents.");
        return;
    }

    const devXML = parseXML(devXMLString);
    const prodXML = parseXML(prodXMLString);

    const devConditions = extractConditions(devXML);
    const prodConditions = extractConditions(prodXML);

    displayComparison(devConditions, prodConditions);
}

function displayComparison(devConditions, prodConditions) {
    let output = "<table border='1'><tr><th>Component</th><th>Dev Condition</th><th>Prod Condition</th></tr>";

    const components = new Set([...devConditions.map(dc => dc.component), ...prodConditions.map(pc => pc.component)]);

    components.forEach(component => {
        const devCondition = devConditions.find(dc => dc.component === component)?.condition || "-";
        const prodCondition = prodConditions.find(pc => pc.component === component)?.condition || "-";
        const rowClass = devCondition !== prodCondition ? "style='background-color: yellow;'" : "";

        output += `<tr ${rowClass}><td>${component}</td><td>${devCondition}</td><td>${prodCondition}</td></tr>`;
    });

    output += "</table>";
    document.getElementById("output").innerHTML = output;
}

function exportHighlightedRowsToExcel() {
    let table = document.querySelector("table");
    let rows = table.querySelectorAll("tr");
    let data = [];

    // Extract only highlighted rows
    rows.forEach(row => {
        if (row.style.backgroundColor === "yellow") {
            let rowData = [];
            row.querySelectorAll("td").forEach(cell => {
                rowData.push(cell.innerText.trim());
            });
            data.push(rowData);
        }
    });

    if (data.length === 0) {
        alert("No highlighted differences to export.");
        return;
    }

    // Convert data to Excel format
    let ws = XLSX.utils.aoa_to_sheet([["Component", "Dev Condition", "Prod Condition"], ...data]);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Differences");
    XLSX.writeFile(wb, "Highlighted_Differences.xlsx");
}
