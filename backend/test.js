async function testRegister() {
  try {
    const response = await fetch('http://localhost:8080/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: "dokter",
        password: "rahasia123",
        role: "dokter"
      })
    });
    const data = await response.json();
    console.log('Response from server:', data);
  } catch (error) {
    console.error('Error during fetch:', error.message);
  }
}

testRegister();
