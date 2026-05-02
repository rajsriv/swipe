const row = { "Roll No": "A101", "Name": "Test" };
const keys = ['Roll No', 'Roll Number', 'Enrollment', 'ID', 'Serial No'];

const findValue = (keys) => {
  const foundKey = Object.keys(row).find(k => 
    keys.some(key => k.toLowerCase().trim() === key.toLowerCase())
  );
  return foundKey ? row[foundKey] : undefined;
};

console.log(String(findValue(keys) || 1));
