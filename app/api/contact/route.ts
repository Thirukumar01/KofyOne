import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, hp } = body;

    // Honeypot check: Bots usually fill hidden fields
    if (hp && typeof hp === 'string' && hp.trim().length > 0) {
      // Silently accept to avoid alerting bot, but do not process
      return NextResponse.json({ success: true, message: 'Message sent successfully.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a message with at least 5 characters.' }, { status: 400 });
    }

    // Sanitize string lengths
    const safeName = typeof name === 'string' ? name.slice(0, 100).trim() : 'Anonymous';
    const safeSubject = typeof subject === 'string' ? subject.slice(0, 200).trim() : 'General Inquiry';
    const safeMessage = message.slice(0, 3000).trim();

    // Log the contact message safely for administrator review
    console.log('[Contact Submission]', {
      from: `${safeName} <${email}>`,
      subject: safeSubject,
      length: safeMessage.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out! We have received your message and will review it shortly.',
    });
  } catch (err) {
    console.error('Contact handler error:', err);
    return NextResponse.json({ error: 'Failed to process message. Please try again later.' }, { status: 500 });
  }
}
