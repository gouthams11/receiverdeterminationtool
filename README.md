# SAP PI/PO Receiver Determination Comparison Tool

This is a web-based tool to compare SAP PI/PO Receiver Determination configurations between Development and Production environments. It highlights differences and allows exporting the results to Excel.

## Features
- Parses XML files containing Receiver Determination rules.
- Compares conditions between Dev and Prod.
- Highlights differences in yellow.
- Exports highlighted differences to an Excel file.

## How to Use
1. Paste the **Development** XML in the first text area.
2. Paste the **Production** XML in the second text area.
3. Click **Compare** to see the differences.
4. Click **Export Highlighted Differences** to download a filtered Excel file.

## Deployment
This tool is hosted using **GitHub Pages**. You can access it (https://gouthams11.github.io/receiverdeterminationtool/).

## Technologies Used
- HTML, JavaScript
- [SheetJS (xlsx)](https://sheetjs.com/) for Excel export

## Contributing
Feel free to fork the repository and submit pull requests.

## License
This project is open-source and available under the MIT License.
