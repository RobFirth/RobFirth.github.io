// Word sets for the Match game, in the order the sounds are taught.
// Each set only uses sounds taught up to that point.
// The picture for a word is always img/words/<word>.svg.
export const matchSets = [
  { id: 'set1', label: 's a t p i n', words: ['pin', 'tap', 'pan', 'tin', 'ant', 'nap'] },
  { id: 'set2', label: 'm d g o c k ck', words: ['dog', 'cat', 'pig', 'map', 'cap', 'sock', 'mat', 'mop', 'pot', 'cot', 'sack', 'tick'] },
  { id: 'set3', label: 'e u r h b f l', words: ['sun', 'hen', 'bus', 'bed', 'rat', 'bat', 'leg', 'bag', 'pen', 'duck', 'hat', 'cup', 'net', 'fan'] },
  { id: 'set4', label: 'ff ll ss', words: ['bell', 'doll', 'hill', 'kiss', 'pill', 'well'] }
];

export const pictureFor = word => `img/words/${word}.svg`;
