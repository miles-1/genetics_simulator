import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip,
    ResponsiveContainer,
} from "recharts";

function round(num, digits=5) {
    return  num === "" ? num : (Math.round(10 ** digits * num) / 10 ** digits);
}

function getName(num, type, freq=false) {
    let end;
    if (type === 1) {
        end = "_freq(A1)"
    } else if (type === 2) {
        end = "_freq(A2)"
    } else if (type === 11 && !freq) {
        end = "_A1A1"
    } else if (type === 11) {
        end = "_freq(A1A1)"
    } else if (type === 12 && !freq) {
        end = "_A1A2"
    } else if (type === 12) {
        end = "_freq(A1A2)"
    } else if (type === 22 && !freq) {
        end = "_A2A2"
    } else if (type === 22) {
        end = "_freq(A2A2)"
    }
    return "Pop" + num + end
}

function getKeyandIndex(string) {
    if (string.includes("I")) {
        let full_key, index;
        let slice_index = string.indexOf("I");
        full_key = string.slice(0, slice_index);
        index = parseInt(string.slice(slice_index + 1));
        return ([full_key, index]);
    } else {
        return ([string, -1]);
    }
}

function processRow(row) {
    let finalVal = '';
    for (let j = 0; j < row.length; j++) {
        let innerValue = row[j] === null ? '' : row[j].toString();
        if (row[j] instanceof Date) {
            innerValue = row[j].toLocaleString();
        };
        let result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
            result = '"' + result + '"';
        if (j > 0)
            finalVal += ',';
        finalVal += result;
    }
    return finalVal + '\n';
};

function exportToCsv(filename, rows) {
    // comes from https://stackoverflow.com/a/24922761/13597979
    let csvFile = '';
    for (let i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }
    let blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        let link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

const defaults = {
    num_pops: 5,
    num_gens: 100,
    pop_size: 250,
    freq_a1: 0.5,
    fit_11: 1,
    fit_12: 1,
    fit_22: 1,
    mut_12: 0,
    mut_21: 0,
    mig_rate: 0,
    inb_rate: 0,
};

const data_keys = [
    "num_pops",
    "num_gens",
    "pop_size",
    "freqs_a1",
    "fitness",
    "mutation",
    "mig_rate",
    "inb_rate",
];

const check_keys = [
    "check_pop",
    "check_freq",
    "check_fit",
    "check_mut",
    "check_mig",
    "check_inb",
];

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            num_pops: defaults.num_pops,
            num_gens: defaults.num_gens,
            pop_size: defaults.pop_size,
            freqs_a1: defaults.freq_a1,
            fitness: [
                defaults.fit_11,
                defaults.fit_12,
                defaults.fit_22,
            ],
            mutation: [
                defaults.mut_12,
                defaults.mut_21,
            ],
            mig_rate: defaults.mig_rate,
            is_entry_valid: {
                num_pops: true,
                num_gens: true,
                pop_size: true,
                freqs_a1: true,
            },
            inb_rate: defaults.inb_rate,
            is_checked: check_keys.reduce((l, c) => Object.assign(l, {[c]: false}), {}),
            sim_data: [],
            run_message: 0,
            lines: 0,
        };

        this.handleEntryChange = this.handleEntryChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.runSimulation = this.runSimulation.bind(this);
        this.saveCSV = this.saveCSV.bind(this);
    }

    handleEntryChange(event, key, is_int) {
        let updates = {is_entry_valid: Object.assign({}, this.state.is_entry_valid)},
            key_info = getKeyandIndex(key);
        let input, valid;
        // round input and calculate if valid
        if (key === "num_pops") {
            input = round(event.target.value, 0);
            valid = (0 < input && input <= 10);
            if (valid && this.state.is_checked["check_freq"]) {
                updates["freqs_a1"] = Array(input).fill(defaults["freq_a1"]);
                for (let i = 0; i < input; i++) {
                    updates.is_entry_valid["freqs_a1I" + i] = true;
                }
                for (let i = input; i < 10; i++) {
                    delete updates.is_entry_valid["freqs_a1I" + i];
                }
            }
        } else if (is_int) {
            input = round(event.target.value, 0);
            valid = (0 < input);
        } else {
            input = round(event.target.value);
            valid = input === "" ? false : (0 <= input && input <= 1);
        }
        // set validity
        updates.is_entry_valid[key] = valid;
        // set value
        if (key_info[1] >= 0) {
            let values = {[key_info[0]]: this.state[key_info[0]].slice()};
            values[key_info[0]][key_info[1]] = input;
            updates = Object.assign(values, updates);
        } else {
            updates[key] = input;
        }
        this.setState(updates)
    }

    handleClick(event, key) {
        let is_checked = Object.assign({}, this.state.is_checked),
            new_state = !is_checked[key],
            pop_size = this.state.pop_size,
            freqs_a1 = this.state.freqs_a1,
            fitness = this.state.fitness.slice(),
            mutation = this.state.mutation.slice(),
            mig_rate = this.state.mig_rate,
            inb_rate = this.state.inb_rate,
            is_entry_valid = Object.assign({}, this.state.is_entry_valid);
        is_checked[key] = new_state;
        if (key === "check_pop") {
            if (new_state) {
                pop_size = Infinity;
                delete is_entry_valid["pop_size"];
            } else {
                pop_size = defaults["pop_size"];
                is_entry_valid["pop_size"] = true;
            }
        } else if (key === "check_freq") {
            if (new_state) {
                freqs_a1 = Array(this.state.num_pops).fill(defaults["freq_a1"]);
                delete is_entry_valid["freqs_a1"];
                for (let i = 0; i < this.state.num_pops; i++) {
                    is_entry_valid["freqs_a1I" + i] = true
                }
            } else {
                freqs_a1 = defaults["freq_a1"];
                is_entry_valid["freqs_a1"] = true;
                for (let i = 0; i < this.state.num_pops; i++) {
                    delete is_entry_valid["freqs_a1I" + i];
                }
            }
        } else if (key === "check_fit") {
            fitness = [defaults.fit_11, defaults.fit_12, defaults.fit_22,];
            if (new_state) {
                for (let i = 0; i < 3; i++) {
                    is_entry_valid["fitnessI" + i] = true;
                }
            } else {
                for (let i = 0; i < 3; i++) {
                    delete is_entry_valid["fitnessI" + i];
                }
            }
        } else if (key === "check_mut") {
            mutation = [defaults.mut_12, defaults.mut_21,];
            if (new_state) {
                for (let i = 0; i < 2; i++) {
                    is_entry_valid["mutationI" + i] = true;
                }
            } else {
                for (let i = 0; i < 3; i++) {
                    delete is_entry_valid["mutationI" + i];
                }
            }
        } else if (key === "check_mig") {
            mig_rate = defaults.mig_rate;
            if (new_state) {
                is_entry_valid["mig_rate"] = true;
            } else {
                delete is_entry_valid["mig_rate"]
            }
        } else if (key === "check_inb") {
            inb_rate = defaults.inb_rate;
            if (new_state) {
                is_entry_valid["inb_rate"] = true;
            } else {
                delete is_entry_valid["inb_rate"]
            }
        }
        this.setState({
            pop_size: pop_size,
            freqs_a1: freqs_a1,
            fitness: fitness,
            mutation: mutation,
            mig_rate: mig_rate,
            inb_rate: inb_rate,
            is_checked: is_checked,
            is_entry_valid: is_entry_valid,
        })
    }

    _getInfFreqs(pop_num, freq11, freq12, freq22) {
        let sum = freq11 + freq12 + freq22;
        return {
            [getName(pop_num, 1)]: round((freq11 + 0.5 * freq12) / sum),
            [getName(pop_num, 2)]: round((freq22 + 0.5 * freq12) / sum),
        }
    }

    _getBndFreqs(pop_num, num11, num12, num22) {
        let sum = num11 + num12 + num22;
        return {
            [getName(pop_num, 1)]: round((num11 + 0.5 * num12) / sum),
            [getName(pop_num, 2)]: round((num22 + 0.5 * num12) / sum),
            [getName(pop_num, 11, true)]: round(num11 / sum),
            [getName(pop_num, 12, true)]: round(num12 / sum),
            [getName(pop_num, 22, true)]: round(num22 / sum),
        }
    }

    _getInfInitialPop(temp_obj, freqs) {
        for (let i = 0; i < this.state.num_pops; i++) {
            let p = freqs[i],
                q = round(1 - p),
                freq11 = round(p**2),
                freq12 = round(2*p*q),
                freq22 = 1 - freq11 - freq12;
            temp_obj[getName(i, 1)] = p;
            temp_obj[getName(i, 2)] = q;
            temp_obj[getName(i, 11, true)] = freq11;
            temp_obj[getName(i, 12, true)] = freq12;
            temp_obj[getName(i, 22, true)] = freq22;
        }
        return temp_obj;
    }

    _getBndInitialPop(temp_obj, freqs) {
        for (let i = 0; i < this.state.num_pops; i++) {
            let num11, num12, num22;
            let p = freqs[i],
                q = round(1 - p),
                rand = Math.random();
            if (rand < 1/3) {
                num11 = Math.round(p**2 * this.state.pop_size);
                num12 = Math.round(2*p*q * this.state.pop_size);
                num22 = this.state.pop_size - num11 - num12;
            } else if (rand < 2/3) {
                num11 = Math.round(p**2 * this.state.pop_size);
                num22 = Math.round(q**2 * this.state.pop_size);
                num12 = this.state.pop_size - num11 - num22;
            } else {
                num12 = Math.round(2*p*q * this.state.pop_size);
                num22 = Math.round(q**2 * this.state.pop_size);
                num11 = this.state.pop_size - num12 - num22;
            }
            temp_obj[getName(i, 11)] = num11;
            temp_obj[getName(i, 12)] = num12;
            temp_obj[getName(i, 22)] = num22;
            Object.assign(temp_obj, this._getBndFreqs(i, num11, num12, num22));
        }
        return temp_obj;
    }

    getInitialPop() {
        let freqs = this.state.freqs_a1;
        if (typeof freqs === "number") {
            freqs = Array(this.state.num_pops).fill(freqs)
        }
        if (this.state.is_checked["check_pop"]) {
            return this._getInfInitialPop({}, freqs)
        } else {
            return this._getBndInitialPop({}, freqs)
        }
    }

    _getNextInfGen(new_obj, obj) {
        let m12 = this.state.mutation[0],
            m21 = this.state.mutation[1],
            mut_var = 1 - m12 - m21,
            inb_rate = this.state.inb_rate;
        for (let i = 0; i < this.state.num_pops; i++) {
            let x11 = obj[getName(i, 11, true)] * this.state.fitness[0],
                x12 = obj[getName(i, 12, true)] * this.state.fitness[1],
                x22 = obj[getName(i, 22, true)] * this.state.fitness[2],
                sumx = x11 + x12 + x22,
                a12 = x12 / sumx,
                a22 = x22 / sumx,
                numr_var = a12*mut_var + 2*a22*mut_var + 2*this.state.mutation[0],
                next_freq11 = round((numr_var - 2)**2/4),
                next_freq22 = round(numr_var**2/4),
                next_freq12 = round(1 - next_freq11 - next_freq22);
            if (inb_rate) {
                let a11 = 1 - a12 - a22,
                    inb_freq11 = round(a11*(1-m12)**2 + a12*0.25*((1-m12)**2+2*m21*(1-m12)+m21**2) + a22*m21**2),
                    inb_freq22 = round(a22*(1-m21)**2 + a12*0.25*((1-m21)**2+2*m12*(1-m21)+m12**2) + a11*m12**2),
                    inb_freq12 = round(1 - inb_freq11 - inb_freq22);
                next_freq11 = round(inb_rate * inb_freq11 + (1 - inb_rate) * next_freq11);
                next_freq12 = round(inb_rate * inb_freq12 + (1 - inb_rate) * next_freq12);
                next_freq22 = round(inb_rate * inb_freq22 + (1 - inb_rate) * next_freq22);
            }
            new_obj[getName(i, 11, true)] = next_freq11;
            new_obj[getName(i, 12, true)] = next_freq12;
            new_obj[getName(i, 22, true)] = next_freq22;
            Object.assign(new_obj, this._getInfFreqs(i, next_freq11, next_freq12, next_freq22))
        }
        return new_obj;
    }

    _getNextInfGen_wMig(new_obj, obj) {
        let cur_obj = this._getNextInfGen({}, obj);
        for (let i = 0; i < this.state.num_pops; i++) {
            let next_i = (i + 1) % this.state.num_pops,
                mig_rate = this.state.mig_rate,
                freq11 = round(cur_obj[getName(i, 11, true)] * (1 - mig_rate) + cur_obj[getName(next_i, 11, true)] * mig_rate),
                freq12 = round(cur_obj[getName(i, 12, true)] * (1 - mig_rate) + cur_obj[getName(next_i, 12, true)] * mig_rate),
                freq22 = round(1 - freq11 - freq12);
            new_obj[getName(i, 11, true)] = freq11;
            new_obj[getName(i, 12, true)] = freq12;
            new_obj[getName(i, 22, true)] = freq22;
            Object.assign(new_obj, this._getInfFreqs(i, freq11, freq12, freq22))
        }
        return new_obj;
    }

    _getBndOffspring(num11, num12, num22) {
        let fit11 = this.state.fitness[0],
            fit12 = this.state.fitness[1],
            fit22 = this.state.fitness[2],
            inb_rate = this.state.inb_rate,
            sum = num11 * fit11 + num12 * fit12 + num22 * fit22,
            parents = [];
        for (let i = 0; i < 2; i++) {
            let rand = Math.random();
            if (rand < num11 * fit11 / sum) {
                parents.push(11);
                num11--;
                sum -= fit11;
            } else if (rand < (num11 * fit11 + num12 * fit12) / sum) {
                parents.push(12);
                num12--;
                sum -= fit12;
            } else {
                parents.push(22);
                num22--;
                sum -= fit22;
            }
        }
        if (Math.random() < inb_rate) {
            parents[0] = parents[1];
        }
        let p_min = Math.min(parents[0], parents[1]),
            p_max = Math.max(parents[0], parents[1]),
            rand = Math.random();
        if (p_min === 11) {
            if (p_max === 11) { // 11 & 11 parents
                return 11;
            } else if (p_max === 12) { // 11 & 12 parents
                if (rand < 0.5) {
                    return 11;
                } else {
                    return 12;
                }
            } else { // 11 & 22 parents
                return 12;
            }
        } else if (p_min === 12) {
            if (p_max === 12) { // 12 & 12 parents
                if (rand < 0.25) {
                    return 11;
                } else if (rand < 0.75) {
                    return 12;
                } else {
                    return 22;
                }
            } else { // 12 & 22 parents
                if (rand < 0.5) {
                    return 12;
                } else {
                    return 22;
                }
            }
        } else { // 12 & 12 parents
            return 22;
        }
    }

    _getBndOffspring_wMut(num11, num12, num22) {
        let m12 = this.state.mutation[0],
            m21 = this.state.mutation[1],
            child = this._getBndOffspring(num11, num12, num22),
            rand = Math.random();
        if (child === 11) {
            if (rand < m12**2) {
                return 22;
            } else if (rand < m12**2 + (1 - m12)**2) {
                return 11;
            } else {
                return 12;
            }
        } else if (child === 12) {
            if (rand < m21*(1- m12)) {
                return 11;
            } else if (rand < m21*(1- m12) + m12*(1- m21)) {
                return 22;
            } else {
                return 12;
            }
        } else {
            if (rand < m21**2) {
                return 11;
            } else if (rand < m21**2 + (1 - m21)**2) {
                return 22;
            } else {
                return 12;
            }
        }
    }

    _getNextBndGen(new_obj, obj) {
        for (let i = 0; i < this.state.num_pops; i++) {
            let next_num11 = 0,
                next_num12 = 0,
                next_num22 = 0,
                num11 = obj[getName(i, 11)],
                num12 = obj[getName(i, 12)],
                num22 = obj[getName(i, 22)];
            for (let j = 0; j < this.state.pop_size; j++) {
                let child;
                if (this.state.is_checked["check_mut"]) {
                    child = this._getBndOffspring_wMut(num11, num12, num22)
                } else {
                    child = this._getBndOffspring(num11, num12, num22)
                }
                if (child === 11) {
                    next_num11++;
                } else if (child === 12) {
                    next_num12++;
                } else {
                    next_num22++;
                }
            }
            new_obj[getName(i, 11)] = next_num11;
            new_obj[getName(i, 12)] = next_num12;
            new_obj[getName(i, 22)] = next_num22;
            Object.assign(new_obj, this._getBndFreqs(i, next_num11, next_num12, next_num22))
        }
        return new_obj
    }

    _getBndMigrants(num11, num12, num22) {
        let mig_num11 = 0,
            mig_num12 = 0,
            mig_num22 = 0,
            num_migrants = round(this.state.pop_size * this.state.mig_rate, 0),
            sum = num11 + num12 + num22;
        for (let i = 0; i < num_migrants; i++) {
            let rand = Math.random();
            if (rand < num11 / sum) {
                mig_num11++;
                num11--;
            } else if (rand < (num11 + num12) / sum) {
                mig_num12++;
                num12--;
            } else {
                mig_num22++;
                num22--;
            }
            sum--;
        }
        return [mig_num11, mig_num12, mig_num22];
    }

    _getNextBndGen_wMig(new_obj, obj) {
        let num11 = obj[getName(0, 11)],
            num12 = obj[getName(0, 12)],
            num22 = obj[getName(0, 22)],
            migrants = [this._getBndMigrants(num11, num12, num22)];
        for (let i = 0; i < this.state.num_pops; i++) {
            let next_i = (i + 1) % this.state.num_pops,
                next_num11 = obj[getName(next_i, 11)],
                next_num12 = obj[getName(next_i, 12)],
                next_num22 = obj[getName(next_i, 22)];
            if (next_i > 0) {
                migrants.push(this._getBndMigrants(next_num11, next_num12, next_num22))
            }
            let num11 = obj[getName(i, 11)] - migrants[i][0] + migrants[next_i][0],
                num12 = obj[getName(i, 12)] - migrants[i][1] + migrants[next_i][1],
                num22 = obj[getName(i, 22)] - migrants[i][2] + migrants[next_i][2];
            new_obj[getName(i, 11)] = num11;
            new_obj[getName(i, 12)] = num12;
            new_obj[getName(i, 22)] = num22;
            Object.assign(new_obj, this._getBndFreqs(i, num11, num12, num22))
        }
        return new_obj;
    }

    getNextGen(obj) {
        if (this.state.is_checked["check_pop"]) {
            if (this.state.is_checked["check_mig"]) {
                return this._getNextInfGen_wMig({}, obj);
            } else {
                return this._getNextInfGen({}, obj);
            }
        } else {
            let new_obj = this._getNextBndGen({}, obj);
            if (this.state.is_checked["check_mig"]) {
                return this._getNextBndGen_wMig({}, new_obj)
            } else {
                return new_obj
            }
        }
    }

    runSimulation() {
        if (Object.values(this.state.is_entry_valid).some((x) => !x)) {
            this.setState({
                run_message: 1 // show error message
            })
        } else {
            this.setState({
                run_message: 2 // show run message
            })
            // set up data stuff
            let previous_dp = Object.assign({time: 0}, this.getInitialPop());
            let data = [previous_dp];
            
            for (let i = 1; i <= this.state.num_gens; i++) {
                let data_point = Object.assign({time: i}, this.getNextGen(previous_dp));
                previous_dp = Object.assign({}, data_point);
                data.push(data_point);
            }
            this.setState({
                sim_data: data,
                lines: this.state.num_pops,
                run_message: 0, // reset message
            })
            return data;
        }
    }

    saveCSV() {
        let data = this.runSimulation().slice();
        let keys = Object.keys(data[0]),
            rows = [keys];
        for (let i = 0; i < data.length; i++) {
            rows.push(Object.values(data[i]))
        }
        exportToCsv("GeneticSim.csv", rows);
    }

    render() {
        return (
            <div id="main">
                <Options
                    num_pops={this.state.num_pops}
                    num_gens={this.state.num_gens}
                    pop_size={this.state.pop_size}
                    freqs_a1={this.state.freqs_a1}
                    fitness={this.state.fitness}
                    mutation={this.state.mutation}
                    mig_rate={this.state.mig_rate}
                    inb_rate={this.state.inb_rate}
                    is_entry_valid={this.state.is_entry_valid}
                    is_checked={this.state.is_checked}
                    run_message={this.state.run_message}

                    handleEntryChange={this.handleEntryChange}
                    handleClick={this.handleClick}
                    runSimulation={this.runSimulation}
                    saveCSV={this.saveCSV}
                />
                <Graph
                    sim_data={this.state.sim_data}
                    lines={this.state.lines}
                />
            </div>
        )
    }
}

class Options extends React.Component {
    getHRule(key) {
        return (<tr key={key}>
            <td colSpan={2}><hr className="divider" /></td>
        </tr>);
    }

    getTitle(key) {
        let key_info = getKeyandIndex(key);
        switch (key_info[0]) {
            // entry fields
            case data_keys[0]:
                return (<span># Populations</span>);
            case data_keys[1]:
                return (<span># Generations</span>);
            case data_keys[2]:
                return (<span>Pop Size</span>);
            case data_keys[3]:
                if (key_info[1] >= 0) {
                    return (<span>Freq(A<sub>1</sub>) - Pop {key_info[1]}</span>);
                } else {
                    return (<span>Freq(A<sub>1</sub>)</span>);
                }
            case data_keys[4]:
                if (key_info[1] === 0) {
                    return (<span>A<sub>1</sub>A<sub>1</sub></span>);
                } else if (key_info[1] === 1) {
                    return (<span>A<sub>1</sub>A<sub>2</sub></span>);
                } else if (key_info[1] === 2) {
                    return (<span>A<sub>2</sub>A<sub>2</sub></span>);
                }
            case data_keys[5]:
                if (key_info[1] === 0) {
                    return (<span>A<sub>1</sub> &rarr; A<sub>2</sub></span>);
                } else if (key_info[1] === 1) {
                    return (<span>A<sub>2</sub> &rarr; A<sub>1</sub></span>);
                }
            case data_keys[6]:
                return (<span>Rate</span>);
            case data_keys[7]:
                return (<span>Selfing Rate</span>);
            
            // checkbox fields
            case check_keys[0]:
                return (<span>Infinite Pop Size</span>);
            case check_keys[1]:
                return (<span>Variable Freq</span>);
            case check_keys[2]:
                return (<span>Fitness</span>);
            case check_keys[3]:
                return (<span>Mutation</span>);
            case check_keys[4]:
                return (<span>Migration</span>);
            case check_keys[5]:
                return (<span>Inbreeding</span>);
        }
        return (<span>Error: Title Not Found</span>);
    }

    getEntry(key, value, is_int=false) {
        return (
            <tr key={key}>
                <td className="input_title">
                    {this.getTitle(key)}
                </td>
                <td>
                    <input
                        type="number"
                        value={value}
                        className={this.props.is_entry_valid[key] ? "valid_input" : "invalid_input"}
                        onChange={(event) => this.props.handleEntryChange(event, key, is_int)} />
                </td>
            </tr>
        );
    }

    getCheck(key) {
        return (
            <tr key={key}>
                <td colSpan={2}>
                    <input 
                        type="checkbox"
                        checked={this.props.is_checked[key] ? "checked" : ""}
                        onChange={(event) => this.props.handleClick(event, key)}
                        className="checkbox_tick"
                        id={key}
                    />
                    <label className="checkbox_label" htmlFor={key}>
                        {this.getTitle(key)}
                    </label>
                </td>
            </tr>
        );
    }

    getButton(title, command) {
        return (
            <td>
                <button 
                    className="button" 
                    onClick={command}
                >
                    {title}
                </button>
            </td>
        );
    }

    getRows() {
        let rows = [
            this.getEntry("num_pops", this.props.num_pops, {is_int: true}),
            this.getEntry("num_gens", this.props.num_gens, {is_int: true}),
        ];
        rows.push(this.getHRule("divider_1"));
        rows.push(this.getCheck("check_pop"));
        if (!this.props.is_checked["check_pop"]) {
            rows.push(this.getEntry("pop_size", this.props.pop_size, {is_int: true}));
        }
        rows.push(this.getHRule("divider_2"));
        rows.push(this.getCheck("check_freq"));
        if (!this.props.is_checked["check_freq"]) {
            rows.push(this.getEntry("freqs_a1", this.props.freqs_a1));
        } else {
            for (let i = 0; i < this.props.num_pops; i++) {
                rows.push(this.getEntry("freqs_a1I" + i, this.props.freqs_a1[i]));
            }
        }
        rows.push(this.getHRule("divider_3"));
        rows.push(this.getCheck("check_fit"));
        if (this.props.is_checked["check_fit"]) {
            for (let i = 0; i < 3; i++) {
                rows.push(this.getEntry("fitnessI" + i, this.props.fitness[i]));
            }
        }
        rows.push(this.getHRule("divider_4"));
        rows.push(this.getCheck("check_mut"));
        if (this.props.is_checked["check_mut"]) {
            for (let i = 0; i < 2; i++) {
                rows.push(this.getEntry("mutationI" + i, this.props.mutation[i]));
            }
        }
        rows.push(this.getHRule("divider_5"));
        rows.push(this.getCheck("check_mig"));
        if (this.props.is_checked["check_mig"]) {
            rows.push(this.getEntry("mig_rate", this.props.mig_rate));
        }
        rows.push(this.getHRule("divider_6"));
        rows.push(this.getCheck("check_inb"));
        if (this.props.is_checked["check_inb"]) {
            rows.push(this.getEntry("inb_rate", this.props.inb_rate));
        }
        rows.push(this.getHRule("divider_7"));
        return rows;
    }

    render() {
        let rows = this.getRows();

        return (
            <div id="options">
                <div id="options_title">
                    Set Parameters
                    <hr />
                </div>
                <table><tbody>
                    {rows}
                </tbody></table>
                <table><tbody><tr>
                    {this.getButton("Run", this.props.runSimulation)}
                    {this.getButton("Save As CSV", this.props.saveCSV)}
                </tr></tbody></table>
                <div 
                    id="error_message"
                    className={this.props.run_message === 1 ? "" : "to_hide"}
                >
                    Improper input. Correct red fields above and try again.
                </div>
                <div 
                    id="normal_message"
                    className={this.props.run_message === 2 ? "" : "to_hide"}
                >
                    Running Simulation...
                </div>
            </div>
        )
    }
}

class Graph extends React.Component {
    constructor(props) {
        super(props);
        // colors from https://coolors.co/palette/f94144-f3722c-f8961e-f9844a-f9c74f-90be6d-43aa8b-4d908e-577590-277da1
        this.state = {
            yaxis: 1,
        }
        this.colors = [
            "#F94144",
            "#277DA1",
            "#90BE6D",
            "#F9C74F",
            "#577590",
            "#F3722C",
            "#43AA8B",
            "#F9844A",
            "#4D908E",
            "#F8961E",
        ];
        this.html_titles = [
            <span>Freq(A<sub>1</sub>)</span>,
            <span>Freq(A<sub>2</sub>)</span>,
            <span>Freq(A<sub>1</sub>A<sub>1</sub>)</span>,
            <span>Freq(A<sub>1</sub>A<sub>2</sub>)</span>,
            <span>Freq(A<sub>2</sub>A<sub>2</sub>)</span>,
        ];

        this.static_titles = [
            "Proportion of A\u2081 (allele)",
            "Proportion of A\u2082 (allele)",
            "Proportion of A\u2081A\u2081 (genotype)",
            "Proportion of A\u2081A\u2082 (genotype)",
            "Proportion of A\u2082A\u2082 (genotype)",
        ]
    }

    convertNumber(num, to_indx=false) {
        let temp_lst = [1, 2, 11, 12, 22];
        if (to_indx) {
            return temp_lst.findIndex((x) => x === num);
        } else {
            return temp_lst[num];
        }
    }

    handleClick(event, indx) {
        this.setState({
            yaxis: this.convertNumber(indx)
        })
    }

    getLines() {
        let lines = [];
        for (let i = 0; i < this.props.lines; i++) {
            lines.push(
                <Line
                    type="linear"
                    dataKey={getName(i, this.state.yaxis, true)}
                    key={getName(i, this.state.yaxis, true)}
                    stroke={this.colors[i]}
                    strokeWidth={2}
                    dot={false}
                />
            )
        };
        return lines;
    }

    getRadios() {
        let radios = [];
        for (let i = 0; i < 5; i++) {
            radios.push(
                <td key={i} className="y_options">
                    <input 
                        type="radio"
                        onChange={(event) => this.handleClick(event, i)}
                        checked={i === this.convertNumber(this.state.yaxis, true) ? "checked" : ""}
                        id={"radio" + i}
                    />
                    <label htmlFor={"radio" + i}>
                        {this.html_titles[i]}
                    </label>
                </td>
            )
        }
        return radios;
    }

    render() {
        return (
            <div id="graph">
                <ResponsiveContainer height={450}>
                    <LineChart
                        data={this.props.sim_data}
                        type="number"
                        margin={{
                            top: 30, right: 30, left: 30, bottom: 30,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis
                            dataKey="time"
                            type="number"
                            label={{ 
                                value: "Generation", 
                                position: "bottom",
                                style: {textAnchor: "middle"},
                            }}
                            domain={["dataMin", "dataMax"]}
                            axisLine={{strokeWidth: 2}}
                        />
                        <YAxis
                            type="number"
                            label={{
                                value: this.static_titles[this.convertNumber(this.state.yaxis, true)],
                                position: "left",
                                angle: -90,
                                style: {textAnchor: "middle"},
                            }}
                            domain={[0, 1]}
                            axisLine={{strokeWidth: 2}}
                        />
                        <Tooltip />
                        {this.getLines()}
                    </LineChart>
                </ResponsiveContainer>
                <table id="graph_options"><tbody>
                    <tr><td colSpan={5} id="graph_options_title">Y-Axis Variable</td></tr>
                    <tr>{this.getRadios()}</tr>
                </tbody></table>
            </div>
        );
    }
}

// ========================================

ReactDOM.render(
    <App />,
    document.getElementById("content")
);