import { format } from 'date-fns'

// Gatsby converts the dateString to epoch string which isn't typical.
// Can we store epoch as uint?
export default function DateComponent({ dateString }) {
  let dateStringFormatted = dateString
  if (isNaN(dateString) == false) {
    const epochTime = parseInt(dateString, 10);
    dateStringFormatted = new Date(epochTime).toISOString();
  }
  return (
    <time dateTime={dateStringFormatted}>
      {format(new Date(dateStringFormatted), 'LLLL	d, yyyy')}
    </time>
  )
}
