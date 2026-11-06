import rawNames from '../../names.yaml'
import { NameBookError, parseNameBook, type NameBook } from '../logic/drinkName'

let book: NameBook | null = null
let error: NameBookError | null = null

try {
  book = parseNameBook(rawNames)
} catch (e) {
  error = e instanceof NameBookError ? e : new NameBookError([String(e)])
}

/** names.yaml 단어장 (오류가 있으면 null) */
export const NAME_BOOK = book
export const NAME_BOOK_ERROR = error
