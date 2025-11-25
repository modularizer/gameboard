export class ScoreCard extends HTMLElement {
    constructor() {
        super();
        let csv = this.innerText;

        // Create shadow root
        this.attachShadow({ mode: 'open' });

        // define shadow root html
        this.shadowRoot.innerHTML = `
            <style>
                #container {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: visible;
  width: auto;
  min-width: 300px;
}

/* For Webkit browsers like Chrome, Safari */
#container::-webkit-scrollbar {
  width: 4px; /* Thin width */
}

#container::-webkit-scrollbar-thumb {
  background-color: black;  /* Black scrollbar thumb */
  border-radius: 4px; /* Rounded corners */
}

#container::-webkit-scrollbar-track {
  background-color: transparent; /* Transparent background */
}

/* For Firefox */
#container {
  scrollbar-width: thin;
  scrollbar-color: black transparent;  /* Black thumb and transparent track */
}


                table, th, td {
                  border: 1px solid black;
                  border-collapse: collapse;
                }
                #table {
                  width: auto;
                  table-layout: auto;
                  margin: 10px;
                }
                th, td {
                  padding: 5px;
                  text-align: left;
                }
                .deleteBtn {
                  cursor: pointer;
                  color: red;
                  font-weight: bold;
                  user-select: none;
                  padding: 2px 5px;
                  font-size: 12px;
                }
                .deleteBtn:hover {
                  background-color: #ffeeee;
                }
                .deleteCol {
                  width: 30px;
                  text-align: center;
                }
            </style>
            <div id="container">
                <table id="table">
                    <tr id="header">
                    </tr>
                </table>
            </div>
            <button id="addRow">+ Row</button>
            <button id="addCol">+ Col</button>
            <button id="reset">x Clear</button>
        `;

        this.onChange = this.onChange.bind(this);
        this.addRowToTable = this.addRowToTable.bind(this);
        this.addColToTable = this.addColToTable.bind(this);
        this.updateMinWidth = this.updateMinWidth.bind(this);
        this.deleteRow = this.deleteRow.bind(this);


        this.initialCSV = csv;


        this.table = this.shadowRoot.getElementById('table');
        this.container = this.shadowRoot.getElementById('container');
        this.addRow = this.shadowRoot.getElementById('addRow');
        this.addCol = this.shadowRoot.getElementById('addCol');
        this.header = this.shadowRoot.getElementById('header');
        this.reset = this.shadowRoot.getElementById('reset');
        this.reset.addEventListener('click', () => {
            this.fromCSV(this.initialCSV);
        })

        this.addRow.addEventListener('click', () => {
            this.addRowToTable();
        });
        this.addCol.addEventListener('click', () => {
            this.addColToTable();
        });
        this.table.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                this.addRowToTable();
            }
        });


        this.fromCSV(csv, false);
    }
    get numRows(){
        return this.table.rows.length + 1;
    }
    set numRows(numRows){
        while(this.table.rows.length > numRows){
            this.table.deleteRow(-1);
        }
        while(this.table.rows.length < numRows){
            this.addRowToTable();
        }
    }
    get numCols(){
        return this.table.rows[0]?this.table.rows[0].cells.length:0;
    }
    set numCols(numCols){
        // Ensure first column is delete column
        if (this.table.rows[0].cells.length === 0) {
            // Add delete column header
            const deleteHeader = document.createElement('th');
            deleteHeader.className = 'deleteCol';
            deleteHeader.innerHTML = '';
            this.header.appendChild(deleteHeader);
        }
        
        while(this.table.rows[0].cells.length > numCols){
            for(let i = 0; i < this.table.rows.length; i++){
                this.table.rows[i].deleteCell(-1);
            }
        }
        while(this.table.rows[0].cells.length < numCols){
            this.addColToTable();
        }
        this.updateMinWidth();
    }
    updateMinWidth(){
        // Allow container and table to expand naturally
        this.table.style.width = 'auto';
        this.table.style.tableLayout = 'auto';
        this.container.style.width = 'auto';
        this.container.style.minWidth = '300px';
        this.container.style.overflowX = 'visible';
    }
    toCSV() {
        let csv = '';
        for (let i = 0; i < this.table.rows.length; i++) {
            for (let j = 1; j < this.table.rows[i].cells.length; j++) { // Start at 1 to skip delete column
                const cell = this.table.rows[i].cells[j];
                // For header cells with delete button, get only the content span
                if (cell.tagName === 'TH') {
                    const contentSpan = cell.querySelector('span[contenteditable]');
                    csv += contentSpan ? contentSpan.textContent : cell.textContent.replace('×', '').trim();
                } else {
                    csv += cell.innerHTML;
                }
                if (j !== this.table.rows[i].cells.length - 1) {
                    csv += ',';
                }
            }
            csv += '\n';
        }
        // remove trailing newline
        csv = csv.slice(0, -1);

        return csv;
    }
    fromCSV(csv, save=true) {
        if (!csv || csv.trim() === "") {
            csv = "Name,Score\n,";
        }
        if(save){
            localStorage.setItem(location.hash + 'score-card', csv);
        }

        csv = csv.replaceAll("||", "\n").replaceAll("|", ",").replaceAll("<br/>", "\n").replaceAll("<br>", "\n").replaceAll("<br />", "\n")
        const rows = csv.split('\n');
        
        // Ensure at least 2 rows (header + 1 data row)
        if (rows.length < 2) {
            const numCols = rows[0] ? rows[0].split(',').length : 2;
            const emptyRow = new Array(numCols).fill('').join(',');
            rows.push(emptyRow);
        }
        
        // Clear existing table content but keep header row structure
        while (this.table.rows.length > 1) {
            this.table.deleteRow(1);
        }
        while (this.header.children.length > 0) {
            this.header.removeChild(this.header.children[0]);
        }
        
        // Add delete column header
        const deleteHeader = document.createElement('th');
        deleteHeader.className = 'deleteCol';
        deleteHeader.innerHTML = '';
        this.header.appendChild(deleteHeader);
        
        // Add data column headers
        let h = rows[0].split(',');
        for (let j = 0; j < h.length; j++) {
            const headerCell = document.createElement('th');
            headerCell.innerHTML = '<span class="deleteBtn">×</span><br><span contenteditable="true">' + h[j] + '</span>';
            headerCell.querySelector('.deleteBtn').addEventListener('click', () => {
                this.deleteCol(headerCell.cellIndex);
            });
            headerCell.querySelector('span[contenteditable]').addEventListener('keydown', this.onChange.bind(this));
            this.header.appendChild(headerCell);
        }
        
        // Add data rows
        for (let i = 1; i < rows.length; i++) {
            const row = document.createElement('tr');
            
            // Add delete button cell
            const deleteCell = document.createElement('td');
            deleteCell.className = 'deleteCol';
            deleteCell.innerHTML = '<span class="deleteBtn">×</span>';
            deleteCell.querySelector('.deleteBtn').addEventListener('click', () => {
                this.deleteRow(row);
            });
            row.appendChild(deleteCell);
            
            // Add data cells
            const cells = rows[i].split(',');
            for (let j = 0; j < cells.length; j++) {
                const cell = document.createElement('td');
                cell.contentEditable = true;
                cell.innerHTML = cells[j];
                cell.addEventListener('keydown', this.onChange.bind(this));
                row.appendChild(cell);
            }
            
            this.table.appendChild(row);
        }
        
        this.updateMinWidth();
    }
    setContent(content) {
        this.table.innerHTML = content;
    }
    addRowToTable() {
        const row = document.createElement('tr');
        const id = this.table.rows.length + 1;
        row.id = `row${id}`;
        
        // Add delete button cell
        const deleteCell = document.createElement('td');
        deleteCell.className = 'deleteCol';
        deleteCell.innerHTML = '<span class="deleteBtn">×</span>';
        deleteCell.querySelector('.deleteBtn').addEventListener('click', () => {
            this.deleteRow(row);
        });
        row.appendChild(deleteCell);
        
        let numCols = this.numCols - 1; // Subtract 1 for delete column
        for (let i = 0; i < numCols; i++) {
            const cell = document.createElement('td');
            cell.id = `r${id}c${i + 1}`;
            cell.contentEditable = true;
            cell.addEventListener('keydown', this.onChange.bind(this));
            row.appendChild(cell);
        }
        this.table.appendChild(row);
    }
    addColToTable() {
        const id = this.table.rows[0].cells.length + 1;
        const header = document.createElement('th');
        header.id = `h${id}`;
        header.innerHTML = '<span class="deleteBtn">×</span><br>';
        const contentSpan = document.createElement('span');
        contentSpan.contentEditable = true;
        contentSpan.addEventListener('keydown', this.onChange.bind(this));
        header.appendChild(contentSpan);
        
        header.querySelector('.deleteBtn').addEventListener('click', () => {
            this.deleteCol(header.cellIndex);
        });
        
        this.header.appendChild(header);
        for (let i = 1; i < this.table.rows.length; i++) {
            const cell = document.createElement('td');
            cell.id = `r${i + 1}c${id}`;
            cell.contentEditable = true;
            cell.addEventListener('change', this.onChange.bind(this));
            this.table.rows[i].appendChild(cell);
        }
        this.updateMinWidth();
    }
    deleteRow(row) {
        if (this.table.rows.length > 2) { // Keep at least header + 1 data row
            row.remove();
            this.save();
        }
    }
    deleteCol(colIndex) {
        if (this.numCols > 2) { // Keep at least delete column + 1 data column
            for (let i = 0; i < this.table.rows.length; i++) {
                this.table.rows[i].deleteCell(colIndex);
            }
            this.updateMinWidth();
            this.save();
        }
    }
    onChange(e){
        setTimeout(() => {
            this.save();
        },100);
    }
    save() {
        let csv = this.toCSV();
        this.dispatchEvent(new CustomEvent('save', { detail: csv }));
        localStorage.setItem(location.hash + 'score-card', csv);
    }
}