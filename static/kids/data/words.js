// Word lists for the kids games.

// Match: word sets in the order the sounds are taught.
// Each set only uses sounds taught up to that point. Exception, by choice: 'ball' (its 'a' is not
// the short a sound) because ff ll ss have few words that are easy to picture.
// The picture for a word is always img/words/<word>.svg.
export const matchSets = [
  { id: 'set1', label: 's a t p i n', words: ['pin', 'tap', 'pan', 'tin', 'ant', 'nap'] },
  { id: 'set2', label: 'm d g o c k ck', words: ['dog', 'cat', 'pig', 'map', 'cap', 'sock', 'mat', 'mop', 'pot', 'cot', 'sack', 'tick'] },
  { id: 'set3', label: 'e u r h b f l', words: ['sun', 'bin', 'bus', 'bed', 'rat', 'bat', 'leg', 'bag', 'pen', 'duck', 'hat', 'cup', 'net', 'fan'] },
  { id: 'set4', label: 'ff ll ss', words: ['bell', 'doll', 'hill', 'kiss', 'ball', 'well'] }
];

export const pictureFor = word => `img/words/${word}.svg`;

// Flashcards: words learned by sight, in two modes a grown-up switches between.
// Each word keeps its own capitals (I, Mr, Mrs, Christmas); everything else is lowercase.
// colour: the card border and tile edge. tint: the tile fill. Pale colours get an ink outline in kids.css.
export const flashModes = [
  { id: 'r', label: 'Tricky (R)' },
  { id: '2', label: 'Tricky (2)' }
];

export const flashDecks = [
  { id: 'yellow', mode: 'r', label: 'Yellow', colour: '#FFC000', tint: '#FFFF99',
    words: ['and', 'as', 'go', 'his', 'I', 'into', 'is', 'of', 'no', 'the', 'to'] },
  { id: 'purple', mode: 'r', label: 'Purple', colour: '#B1A0C7', tint: '#CCC0DA',
    words: ['all', 'are', 'be', 'down', 'for', 'he', 'her', 'look', 'me', 'my', 'now', 'see', 'she', 'they', 'too', 'was', 'we', 'with', 'you'] },
  { id: 'green', mode: 'r', label: 'Green', colour: '#00B050', tint: '#C4D79B',
    words: ['children', 'come', 'do', 'have', 'like', 'little', 'one', 'out', 'said', 'some', 'so', 'were', 'there', 'what', 'when', 'went'] },
  { id: 'tricky1', mode: '2', label: 'Tricky 1', colour: '#0E9AA7', tint: '#C3E6E9',
    words: ['after', 'again', 'any', 'bath', 'beautiful', 'because', 'behind', 'both', 'break', 'busy', 'child', 'children', 'Christmas'] },
  { id: 'tricky2', mode: '2', label: 'Tricky 2', colour: '#FF6B6B', tint: '#FFDADA',
    words: ['class', 'climb', 'clothes', 'could', 'cold', 'door', 'even', 'every', 'everybody', 'eye', 'fast', 'father', 'find'] },
  { id: 'tricky3', mode: '2', label: 'Tricky 3', colour: '#3D348B', tint: '#CECCE2',
    words: ['floor', 'gold', 'grass', 'great', 'half', 'hold', 'hour', 'improve', 'kind', 'last', 'many', 'mind', 'money'] },
  { id: 'tricky4', mode: '2', label: 'Tricky 4', colour: '#FF9F43', tint: '#FFE7D0',
    words: ['most', 'move', 'Mr', 'Mrs', 'old', 'only', 'parents', 'pass', 'past', 'path', 'people', 'plant', 'poor'] },
  { id: 'tricky5', mode: '2', label: 'Tricky 5', colour: '#4A90D9', tint: '#D2E3F6',
    words: ['pretty', 'prove', 'should', 'steak', 'sugar', 'sure', 'told', 'water', 'whole', 'who', 'wild', 'would'] }
];
