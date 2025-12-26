const axios = require('axios');

async function testCompiler() {
  try {
    const res = await axios.post(
      'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
      {
        language_id: 54, // C++
        source_code: '#include<iostream>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a+b;return 0;}',
        stdin: '4 5'
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Compiler response:', res.data); // Should show stdout: 9
  } catch (err) {
    console.error('Compiler error:', err.response?.data || err.message);
  }
}

testCompiler();
