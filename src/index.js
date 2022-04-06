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
};

const data_keys = [
    "num_pops",
    "num_gens",
    "pop_size",
    "freqs_a1",
    "fitness",
    "mutation",
    "mig_rate",
];

const check_keys = [
    "check_pop",
    "check_freq",
    "check_fit",
    "check_mut",
    "check_mig",
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
            is_checked: check_keys.reduce((l, c) => Object.assign(l, {[c]: false}), {}),
            sim_data: [],
            run_message: 0,
            lines: 0,
        };

        this.handleEntryChange = this.handleEntryChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.runSimulation = this.runSimulation.bind(this);
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
        } 
        this.setState({
            pop_size: pop_size,
            freqs_a1: freqs_a1,
            fitness: fitness,
            mutation: mutation,
            mig_rate: mig_rate,
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
            temp_obj[getName(i, 11)] = Infinity;
            temp_obj[getName(i, 12)] = Infinity;
            temp_obj[getName(i, 22)] = Infinity;
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

    ______getOffspring(obj, pop_num) {
        let fit11 = this.state.values[5],
            fit12 = this.state.values[6],
            fit22 = this.state.values[7],
            num11 = obj[getName(pop_num, 11)],
            num12 = obj[getName(pop_num, 12)],
            num22 = obj[getName(pop_num, 22)],
            sum = num11*fit11 + num12*fit12 + num22*fit22,
            parents = [];
        for (let i = 0; i < 2; i++) {
            let rand = Math.random();
            if (rand < num11*fit11/sum) {
                parents.push(11);
            } else if (rand < (num11*fit11 + num12*fit12)/sum) {
                parents.push(12);
            } else {
                parents.push(22);
            }
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

    ______getMutantOffspring(obj, pop_num) {
        let m12 = this.state.values[8],
            m21 = this.state.values[9],
            child = this.getOffspring(obj, pop_num),
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

    ______getNextGen(obj) {
        let temp_obj = {};
        for (let i = 0; i < this.state.num_pops; i++) {
            let num11 = 0,
                num12 = 0,
                num22 = 0;
            for (let j = 0; j < this.state.pop_size; j++) {
                let child;
                if (this.state.is_checked["check_mut"]) {
                    child = this.getMutantOffspring(obj, i)
                } else {
                    child = this.getOffspring(obj, i)
                }
                if (child === 11) {
                    num11++;
                } else if (child === 12) {
                    num12++;
                } else {
                    num22++;
                }
            }
            temp_obj[getName(i, 11)] = num11;
            temp_obj[getName(i, 12)] = num12;
            temp_obj[getName(i, 22)] = num22;
        }
        let temp_copy;
        if (this.state.is_checked["check_mig"]) {
            temp_copy = Object.assign({}, temp_obj);
        }
        for (let i = 0; i < this.state.num_pops; i++) {
            if (this.state.is_checked["check_mig"]) {
                let neighbor = (i % this.state.num_pops) + 1,
                    genotypes = [11, 12, 22];
                for (let j = 0; j < 3; j++) {
                    let gt = genotypes[j]
                    temp_obj[getName(i, gt)] =
                        Math.round(temp_copy[getName(neighbor, gt)] * this.state.mig_rate) + 
                        Math.round(temp_copy[getName(i, gt)] * (1 - this.state.mig_rate));
                }
            }
            let num11 = temp_obj[getName(i, 11)],
                num12 = temp_obj[getName(i, 12)],
                num22 = temp_obj[getName(i, 22)];
            Object.assign(temp_obj, this._getBndFreqs(i, num11, num12, num22))
        }
        return temp_obj
    }

    _getNextInfGen(new_obj, obj) {
        let mut_var = 1 - this.state.mutation[0] - this.state.mutation[1];
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
            new_obj[getName(i, 11, true)] = next_freq11;
            new_obj[getName(i, 12, true)] = next_freq12;
            new_obj[getName(i, 22, true)] = next_freq22;
            new_obj[getName(i, 11)] = Infinity;
            new_obj[getName(i, 12)] = Infinity;
            new_obj[getName(i, 22)] = Infinity;
            Object.assign(new_obj, this._getInfFreqs(i, next_freq11, next_freq12, next_freq22))
        }
        return new_obj;
    }

    getNextGen(obj) {
        if (this.state.is_checked["check_pop"]) {
            return this._getNextInfGen({}, obj);
        } else {
            // TODO
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
            // console.log(data); // TODO
            this.setState({
                sim_data: data,
                lines: this.state.num_pops,
                run_message: 0, // reset message
            })
        }
        
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
                    is_entry_valid={this.state.is_entry_valid}
                    is_checked={this.state.is_checked}
                    run_message={this.state.run_message}

                    handleEntryChange={this.handleEntryChange}
                    handleClick={this.handleClick}
                    runSimulation={this.runSimulation}
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
                return (<span>Population Size</span>);
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
                    />
                    <label>
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
                    {this.getButton("Save As CSV", (_) => alert("I haven't implimented this yet. teehee"))}
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

    render() {
        let lines = [];
        for (let i = 0; i < this.props.lines; i++) {
            lines.push(
                <Line
                    type="linear"
                    dataKey={getName(i, this.state.yaxis, true)}
                    key={getName(i, this.state.yaxis, true)}
                    stroke={this.colors[i]}
                    dot={false}
                />
            )
        };

        let radios = [];
        for (let i = 0; i < 5; i++) {
            radios.push(
                <td key={i}>
                    <input 
                        type="radio"
                        onChange={(event) => this.handleClick(event, i)}
                        checked={i === this.convertNumber(this.state.yaxis, true) ? "checked" : ""}
                    />
                    <label>
                        {this.html_titles[i]}
                    </label>
                </td>
            )
        }

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
                        />
                        <Tooltip />
                        {lines}
                    </LineChart>
                </ResponsiveContainer>
                <table id="graph_options"><tbody><tr>
                    {radios}
                </tr></tbody></table>
            </div>
        );
    }
}

// ========================================

ReactDOM.render(
    <App />,
    document.getElementById("content")
);