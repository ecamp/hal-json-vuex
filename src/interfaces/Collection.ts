import Resource from './Resource'

export default interface Collection {
    items: Array<Resource>
    allItems: Array<Resource>
}
