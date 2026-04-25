const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const STYLIST_PHONES = {
  'John Gutierrez':   process.env.JOHN_PHONE      || '+13104875469',
  'Fernando Candela': process.env.FERNANDO_PHONE  || '+13103513475',
  'Zhanna':           process.env.ZHANNA_PHONE    || '+14243404979',
  'Kelly Wang':       process.env.KELLY_PHONE     || '+13103441676',
  'Song':             process.env.SONG_PHONE      || '+13103730759',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER');
    return { statusCode: 500, body: JSON.stringify({ error: 'SMS service not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { stylist_name, client_name, service, date, time, client_phone } = body;
  const toNumber = STYLIST_PHONES[stylist_name];

  if (!toNumber) {
    return { statusCode: 400, body: `Unknown stylist: ${stylist_name}` };
  }

  const message =
    `JT Salon booking:\n` +
    `Client: ${client_name}\n` +
    `Service: ${service}\n` +
    `Date: ${date} @ ${time}\n` +
    `Phone: ${client_phone}`;

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ To: toNumber, MessagingServiceSid: 'MGa82728e3782d91632c8be204f0cecc4b', Body: message })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Twilio error:', data);
      return { statusCode: 502, body: JSON.stringify({ error: data.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sid: data.sid, status: data.status })
    };
  } catch (err) {
    console.error('Send-SMS function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
