import {intParam, Param, ParsedParam, parseHashParams} from "next-utils/params";

type Params = {
    n: Param<number>
    o: Param<number>
}

type ParsedParams = {
    n: ParsedParam<number>
    o: ParsedParam<number>
}

export default function Page() {
    const params: Params = {
        n: intParam(0),
        o: intParam(0),
    }

    const {
        n: [ n, setN ],
        o: [ o, setO ],
    }: ParsedParams = parseHashParams({ params })

    return (
        <div>
            <h1>Fragment Test</h1>
            <p>Fragment Test: {n} {o}</p>
            <input type={"number"} value={n} onChange={e => setN(parseInt(e.target.value))} />
            <input type={"number"} value={o} onChange={e => setO(parseInt(e.target.value))} />
        </div>
    )
}
