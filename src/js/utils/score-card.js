export class ScoreCard extends HTMLElement {
    constructor() {
        super();
        let csv = this.innerText;
        console.log("csv", csv, this.innerHTML);

        // Create shadow root
        this.attachShadow({ mode: 'open' });

        // define shadow root html
        this.shadowRoot.innerHTML = `
            <style>
                #container {
  max-height: 200px;
  overflow-y: scroll;
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
                th, td {
                  padding: 5px;
                  text-align: left;
                }
            </style>
            <div id="container">
                <table id="table">
                    <tr id="header">
                    </tr>
                </table>
            </div>
            <button id="addRow">+_</button>
            <button id="addCol">+|</button>
            <button id="reset">x</button>
        `;

        this.onChange = this.onChange.bind(this);
        this.addRowToTable = this.addRowToTable.bind(this);
        this.addColToTable = this.addColToTable.bind(this);


        this.initialCSV = csv;


        this.table = this.shadowRoot.getElementById('table');
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
        while(this.table.rows[0].cells.length > numCols){
            for(let i = 0; i < this.table.rows.length; i++){
                this.table.rows[i].deleteCell(-1);
            }
        }
        while(this.table.rows[0].cells.length < numCols){
            this.addColToTable();
        }
    }
    toCSV() {
        let csv = '';
        for (let i = 0; i < this.table.rows.length; i++) {
            for (let j = 0; j < this.table.rows[i].cells.length; j++) {
                csv += this.table.rows[i].cells[j].innerHTML;
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
        if (!csv) {csv = ""}
        if(save){
            localStorage.setItem(location.hash + 'score-card', csv);
        }

        csv = csv.replaceAll("||", "\n").replaceAll("|", ",").replaceAll("<br/>", "\n").replaceAll("<br>", "\n").replaceAll("<br />", "\n")
        const rows = csv.split('\n');
        this.numRows = rows.length;
        this.numCols = rows[0].split(',').length;
        let h = rows[0].split(',');
        for (let j= 0; j < h.length; j++) {
            this.header.children[j].innerHTML = h[j];
        }
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].split(',');
            for (let j = 0; j < cells.length; j++) {
                this.table.rows[i].cells[j].innerHTML = cells[j];
            }
        }
    }
    setContent(content) {
        this.table.innerHTML = content;
    }
    addRowToTable() {
        const row = document.createElement('tr');
        const id = this.table.rows.length + 1;
        row.id = `row${id}`;
        let numCols = this.numCols;
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
        header.contentEditable = true;
        this.header.appendChild(header);
        for (let i = 1; i < this.table.rows.length; i++) {
            const cell = document.createElement('td');
            cell.id = `r${i + 1}c${id}`;
            cell.contentEditable = true;
            cell.addEventListener('change', this.onChange.bind(this));
            this.table.rows[i].appendChild(cell);
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