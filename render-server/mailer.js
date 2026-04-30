import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const TEST_MODE = process.env.TEST_EMAIL_ONLY === 'true';
const TEST_EMAIL = process.env.TEST_EMAIL_ADDRESS;

export async function sendReferralEmails(client, matchedAgents) {
  // Send to client
  await resend.emails.send({
    from: 'referrals@webrealtorfl.com',
    to: TEST_MODE ? TEST_EMAIL : client.email,
    subject: 'We Found Your Perfect Agent Match!',
    html: `
      <h1>Great News, ${client.name}!</h1>
      <p>We've matched you with ${matchedAgents.length} top agents in ${client.desired_city}.</p>
      <p>Your top match: <strong>${matchedAgents[0].name}</strong></p>
      <p>You'll be contacted shortly to discuss your real estate needs.</p>
    `
  });
  
  // Send to agents (in test mode, all go to your email)
  for (const agent of matchedAgents) {
    await resend.emails.send({
      from: 'referrals@webrealtorfl.com',
      to: TEST_MODE ? TEST_EMAIL : agent.email,
      subject: `New Client Referral: ${client.name} in ${client.desired_city}`,
      html: `
        <h1>New Client Referral</h1>
        <p><strong>Client:</strong> ${client.name}</p>
        <p><strong>Location:</strong> ${client.desired_city}</p>
        <p><strong>Specialties Needed:</strong> ${client.agent_specialties?.join(', ')}</p>
        <p><strong>Language:</strong> ${client.preferred_language}</p>
        <p><strong>Budget:</strong> ${client.budget}</p>
        <p>This client has been matched to you based on your profile.</p>
      `
    });
  }
}
