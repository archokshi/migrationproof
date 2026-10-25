export const corpus = Object.freeze([
  { id: 'basic', label: 'Basic inventory', input: 'id,name,quantity,description\n123,Widget,7,Standard\n' },
  { id: 'leading-zero', label: 'Opaque leading-zero ID', input: 'id,name,quantity,description\n00127,Widget,7,Standard\n' },
  { id: 'quoted-comma', label: 'Quoted comma', input: 'id,name,quantity,description\n12,"Nuts, bolts",2,"Pack, large"\n' },
  { id: 'escaped-quote', label: 'Escaped quotes', input: 'id,name,quantity,description\n12,"A ""special"" part",2,note\n' },
  { id: 'crlf', label: 'Windows line endings', input: 'id,name,quantity,description\r\n12,Widget,2,ok\r\n' },
  { id: 'unicode', label: 'Unicode text', input: 'id,name,quantity,description\n12,Café,2,装置\n' },
  { id: 'duplicate', label: 'Duplicate ID keeps last value', input: 'id,name,quantity,description\n12,Old,2,first\n12,New,3,last\n' },
  { id: 'zero', label: 'Zero quantity', input: 'id,name,quantity,description\n12,Widget,0,none\n' },
  { id: 'trim', label: 'Name whitespace', input: 'id,name,quantity,description\n12,  Widget  ,2, keep spaces \n' },
  { id: 'empty', label: 'Header only', input: 'id,name,quantity,description\n' },
  { id: 'missing-id', label: 'Missing ID is rejected', input: 'id,name,quantity,description\n,Widget,2,none\n' },
  { id: 'bad-quantity', label: 'Invalid quantity is rejected', input: 'id,name,quantity,description\n12,Widget,2.5,none\n' },
  { id: 'bad-header', label: 'Wrong header is rejected', input: 'name,id,quantity,description\nWidget,12,2,none\n' },
  { id: 'unclosed-quote', label: 'Unclosed quote is rejected', input: 'id,name,quantity,description\n12,"Widget,2,none\n' },
  { id: 'bad-row', label: 'Missing column is rejected', input: 'id,name,quantity,description\n12,Widget,2\n' }
]);
