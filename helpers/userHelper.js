const verfiyPAN = async (pan) => {
  const response = await fetch(
    "https://sandbox.cashfree.com/verification/pan",
    {
      method: "POST",
      headers: {
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pan }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PAN verification failed: ${error}`);
  }

  const data = await response.json();
  console.log(data);

  return data;
};

module.exports = {
  verfiyPAN,
};
