import {Select} from '@dbgate/sqltree'

export default abstract class GridDisplay {
    abstract getPageQuery(offse: number, count: number): string;
}
