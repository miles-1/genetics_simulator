import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

function round(num, digits=5) {
    return  num === "" ? num : (Math.round(10 ** digits * num) / 10 ** digits);
}

function getName(num, type) {
    let end;
    if (type === 1) {
        end = "_freq(A1)"
    } else if (type === 2) {
        end = "_freq(A2)"
    } else if (type === 11) {
        end = "_A1A1"
    } else if (type === 12) {
        end = "_A1A2"
    } else if (type === 22) {
        end = "_A2A2"
    }
    return "Pop" + num + end
}

const defaults = {
    num_pops: 5,
    num_gens: 100,
    pop_size: 250,
    freq_a1: 0.5,
    freq_a2: 0.5,
    fit_11: 1,
    fit_12: 1,
    fit_22: 1,
    mut_12: 0,
    mut_21: 0,
    mig_rate: 0,
};

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            values: [
                defaults.num_pops,
                defaults.num_gens,
                defaults.pop_size,
                defaults.freq_a1,
                defaults.freq_a2,
                defaults.fit_11,
                defaults.fit_12,
                defaults.fit_22,
                defaults.mut_12,
                defaults.mut_21,
                defaults.mig_rate,
            ],
            is_valid: Array(11).fill(true),
            actives: [false, false, false],
            data: [],
            message: false,
            lines: 0,
        };

        this.handleChange = this.handleChange.bind(this);
        this.shouldRender = this.shouldRender.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.runSimulation = this.runSimulation.bind(this);
    }

    handleChange(event, index) {
        const values = this.state.values.slice();
        const is_valid = this.state.is_valid.slice();
        // num pops, num gens and pop size
        if (index <= 2) {
            const count = round(event.target.value, 0);
            values[index] = count;
            is_valid[index] = index === 0 ? (0 < count && count <= 10) : (0 < count);
        // freq a1, freq a2, fit 11, fit 12, fit 22, mut 12, mut 21, mig rate
        } else if (3 <= index) {
            const prop = round(event.target.value);
            values[index] = prop;
            is_valid[index] = prop === "" ? false : (0 <= prop && prop <= 1);
            // freq a1, freq a2
            if ((index === 3 || index === 4) && prop !== "") {
                const comp = round(1 - prop);
                values[7 - index] = comp;
                is_valid[7 - index] = 0 <= comp && comp <= 1
            }
        }
        this.setState({
            values: values,
            is_valid: is_valid,
        })
    }

    shouldRender(index) {
        if (index <= 4) {
            return true;
        } else if (5 <= index && index <= 7 && this.state.actives[0]) {
            return true;
        } else if (8 <= index && index <= 9 && this.state.actives[1]) {
            return true;
        } else if (index === 10 && this.state.actives[2]) {
            return true;
        } else {
            return false;
        }
    }

    handleClick(event, index) {
        const actives = this.state.actives.slice(),
            values = this.state.values.slice(),
            is_valid = this.state.is_valid.slice(),
            default_vals = Object.values(defaults);
        let checkbox_state = !actives[index];
        actives[index] = !actives[index]
        if (!checkbox_state) {
            if (index === 0) {
                for (let i = 5; i <= 7; i++) {
                    values[i] = default_vals[i];
                    is_valid[i] = true;
                }
            } else if (index === 1) {
                for (let i = 8; i <= 9; i++) {
                    values[i] = default_vals[i];
                    is_valid[i] = true;
                }
            } else if (index === 2) {
                values[10] = default_vals[10];
                is_valid[10] = true;
            }
        }
        this.setState({
            actives: actives,
            values: values,
            is_valid: is_valid,
        })
    }

    getAlleleFreq(a1a1, a1a2, a2a2) {
        let sum = a1a1 + a1a2 + a2a2;
        return [round((a1a1 + 0.5*a1a2)/sum), round((a2a2 + 0.5*a1a2)/sum)];
    }

    getInitialPop() {
        let rand = Math.random(),
            num_pops = this.state.values[0],
            pop_size = this.state.values[2],
            p = this.state.values[3],
            q = this.state.values[4],
            temp_obj = {};
        for (let i = 0; i < num_pops; i++) {
            let a1a1, a1a2, a2a2;
            if (rand < 1/3) {
                a1a1 = Math.round(p**2 * pop_size);
                a1a2 = Math.round(2*p*q * pop_size);
                a2a2 = pop_size - a1a1 - a1a2;
            } else if (rand < 2/3) {
                a1a1 = Math.round(p**2 * pop_size);
                a2a2 = Math.round(q**2 * pop_size);
                a1a2 = pop_size - a1a1 - a2a2;
            } else {
                a1a2 = Math.round(2*p*q * pop_size);
                a2a2 = Math.round(q**2 * pop_size);
                a1a1 = pop_size - a1a2 - a2a2;
            }
            let alleles = this.getAlleleFreq(a1a1, a1a2, a2a2);
            temp_obj[getName(i, 1)] = alleles[0];
            temp_obj[getName(i, 2)] = alleles[1];
            temp_obj[getName(i, 11)] = a1a1;
            temp_obj[getName(i, 12)] = a1a2;
            temp_obj[getName(i, 22)] = a2a2;
        }
        return temp_obj;
    }

    getOffspring(obj, pop_num) {
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

    getMutantOffspring(obj, pop_num) {
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

    getNextGen(obj) {
        let is_mut = this.state.actives[1],
            is_mig = this.state.actives[2],
            num_pops = this.state.values[0],
            pop_size = this.state.values[2],
            mig_rate = this.state.values[10],
            temp_obj = {};
        for (let i = 0; i < num_pops; i++) {
            let num11 = 0,
                num12 = 0,
                num22 = 0;
            for (let j = 0; j < pop_size; j++) {
                let child;
                if (is_mut) {
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
        if (is_mig) {
            temp_copy = Object.assign({}, temp_obj);
        }
        for (let i = 0; i < num_pops; i++) {
            if (is_mig) {
                let neighbor = (i % num_pops) + 1,
                    genotypes = [11, 12, 22];
                for (let j = 0; j < 3; j++) {
                    let gt = genotypes[j]
                    temp_obj[getName(i, gt)] =
                        Math.round(temp_copy[getName(neighbor, gt)] * mig_rate) + 
                        Math.round(temp_copy[getName(i, gt)] * (1 - mig_rate));
                }
            }
            let num11 = temp_obj[getName(i, 11)],
                num12 = temp_obj[getName(i, 12)],
                num22 = temp_obj[getName(i, 22)],
                alleles = this.getAlleleFreq(num11, num12, num22);
            temp_obj[getName(i, 1)] = alleles[0];
            temp_obj[getName(i, 2)] = alleles[1];
        }
        return temp_obj
    }

    runSimulation() {
        if (this.state.is_valid.some((x) => !x)) {
            this.setState({
                message: true
            })
        } else {
            // unpack vars
            let num_pops = this.state.values[0],
                num_gens = this.state.values[1];
            // set up data stuff
            let previous_dp = Object.assign({time: 0}, this.getInitialPop());
            let data = [previous_dp];
            for (let i = 1; i <= num_gens; i++) {
                let data_point = Object.assign({time: i}, this.getNextGen(previous_dp));
                data.push(data_point)
                previous_dp = Object.assign({}, data_point)
            }
            this.setState({
                data: data,
                lines: num_pops,
                message: false,
            })
        }
    }

    render() {
        return (
            <div id="main">
                <Options
                    values={this.state.values}
                    is_valid={this.state.is_valid}
                    actives={this.state.actives}
                    message={this.state.message}
                    handleChange={this.handleChange}
                    shouldRender={this.shouldRender}
                    handleClick={this.handleClick}
                    runSimulation={this.runSimulation}
                />
                <Graph
                    data={this.state.data}
                    values={this.state.values}
                    lines={this.state.lines}
                />
            </div>
        )
    }
}

class Options extends React.Component {
    constructor(props) {
        super(props);
        this.titles = [
            <span># Populations</span>,
            <span># Generations</span>,
            <span>Population Size</span>,
            <span>Freq(A<sub>1</sub>)</span>,
            <span>Freq(A<sub>2</sub>)</span>,
            <span>A<sub>1</sub>A<sub>1</sub></span>,
            <span>A<sub>1</sub>A<sub>2</sub></span>,
            <span>A<sub>2</sub>A<sub>2</sub></span>,
            <span>A<sub>1</sub> &rarr; A<sub>2</sub></span>,
            <span>A<sub>2</sub> &rarr; A<sub>1</sub></span>,
            <span>Rate</span>,
            <span>Fitness</span>,
            <span>Mutation</span>,
            <span>Migration</span>,
        ];
    }

    render() {
        let rows = [];
        for (let i = 0; i < this.props.values.length; i++) {
            rows.push(
                <tr key={i} className={this.props.shouldRender(i) ? "" : "to_hide"}>
                    <td className="input_title">
                        {this.titles[i]}
                    </td>
                    <td>
                        <input
                            type="number"
                            value={this.props.values[i]}
                            className={this.props.is_valid[i] ? 'valid_input' : 'invalid_input'}
                            onChange={(event) => this.props.handleChange(event, i)} />
                    </td>
                </tr>
            );
        }

        let checks = [];
        for (let i = this.props.values.length; i < this.titles.length; i++) {
            let temp_i = i - this.props.values.length
            checks.push(
                <tr>
                    <td colSpan={2} key={i}>
                        <input 
                            type="checkbox"
                            checked={this.props.actives[temp_i] ? "checked" : ""}
                            onChange={(event) => this.props.handleClick(event, temp_i)}
                        />
                        <label>
                            {this.titles[i]}
                        </label>
                    </td>
                </tr>
            );
        }

        let hrule = (
            <tr>
                <td colSpan={2}><hr className="divider" /></td>
            </tr>
        );

        return (
            <div id="options">
                <div id="options_title">
                    Set Parameters
                    <hr />
                </div>
                <table><tbody>
                    {rows.slice(0,3)}
                    {hrule}
                    {rows.slice(3,5)}
                    {hrule}
                    {checks[0]}
                    {rows.slice(5,8)}
                    {hrule}
                    {checks[1]}
                    {rows.slice(8,10)}
                    {hrule}
                    {checks[2]}
                    {rows.slice(10,11)}
                    {hrule}
                </tbody></table>
                <table><tbody><tr>
                    <td>
                        <button 
                            className="button" 
                            onClick={(_) => this.props.runSimulation()}
                        >
                            Run
                        </button>
                    </td>
                    <td>
                        <button 
                            className="button" 
                            onClick={() => alert("I haven't implimented this yet. teehee")}
                        >
                            Save As CSV
                        </button>
                    </td>
                </tr></tbody></table>
                <div 
                    id="error_message"
                    className={this.props.message ? "" : "to_hide"}
                >
                    Improper input. Correct red fields above and try again.
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
            "Proportion of A1 (allele)",
            "Proportion of A2 (allele)",
            "Number of A1A1 (genotype)",
            "Number of A1A2 (genotype)",
            "Number of A2A2 (genotype)",
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
                    dataKey={getName(i, this.state.yaxis)}
                    key={"Pop_" + (i)}
                    stroke={this.colors[i]}
                    dot={false}
                />
            )
        };

        let checks = [];
        for (let i = 0; i < 5; i++) {
            checks.push(
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
                <table><tbody><tr>
                    {checks}
                </tr></tbody></table>
                <ResponsiveContainer height={450}>
                    <LineChart
                        data={this.props.data}
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
                            domain={['dataMin', 'dataMax']}
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
            </div>
        );
    }
}

// ========================================

ReactDOM.render(
    <App />,
    document.getElementById('content')
);