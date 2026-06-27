import nodemailer from 'nodemailer';

/**
 * Creates an SMTP transporter using environment variables.
 * Returns null if SMTP configuration is incomplete.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Silent fallback when not configured, avoiding app crashes.
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a low stock alert email to the store owner.
 * @param {string} productName - Product name
 * @param {string} bottleLabel - Friendly bottle label (e.g. "Bottle #001")
 * @param {number} remainingML - Current liquid level in ML
 * @param {number} bottleSizeML - Total bottle capacity in ML
 */
export async function sendLowStockAlert(productName, bottleLabel, remainingML, bottleSizeML) {
  const recipient = process.env.ALERT_EMAIL || process.env.SMTP_USER;
  if (!recipient) {
    console.log(`[Email Service] Low Stock Alert (No ALERT_EMAIL configured): ${productName} - ${bottleLabel} is low (${remainingML}ml / ${bottleSizeML}ml)`);
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email Service] Low Stock Alert (SMTP not configured): ${productName} - ${bottleLabel} is low (${remainingML}ml / ${bottleSizeML}ml)`);
    return;
  }

  const percentage = Math.round((remainingML / bottleSizeML) * 100);

  const mailOptions = {
    from: `"Decant Atelier Inventory" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `⚠️ Low Stock Alert: ${productName} (${bottleLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #ea580c; margin-top: 0;">Inventory Alarm Triggered</h2>
        <p>This is an automated warning that a perfume bottle has fallen below its low stock threshold.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Product:</td>
            <td style="padding: 8px 0;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Bottle Label:</td>
            <td style="padding: 8px 0;">${bottleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Current Status:</td>
            <td style="padding: 8px 0; color: #ef4444; font-weight: bold;">${remainingML}ml / ${bottleSizeML}ml (${percentage}%)</td>
          </tr>
        </table>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <div style="text-align: center; margin-top: 25px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" style="background-color: #1c1b18; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 4px; display: inline-block;">Open Admin Panel</a>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Low Stock Alert email sent successfully: ${info.messageId}`);
  } catch (err) {
    console.error('[Email Service] Failed to send low stock alert email:', err);
  }
}

/**
 * Sends a new order notification email to the store owner.
 * @param {object} order - Order object with items and subtotal
 * @param {string} customerName - Name of customer
 */
export async function sendNewOrderAlert(order, customerName) {
  const recipient = process.env.ALERT_EMAIL || process.env.SMTP_USER;
  if (!recipient) {
    console.log(`[Email Service] New Order Alert (No ALERT_EMAIL configured): Order ${order.orderReference || order.id} placed by ${customerName}`);
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email Service] New Order Alert (SMTP not configured): Order ${order.orderReference || order.id} placed by ${customerName}`);
    return;
  }

  const itemsHtml = order.orderItems.map(item => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 10px 0; font-size: 14px;">${item.productName} (${item.size})</td>
      <td style="padding: 10px 0; text-align: center; font-size: 14px;">x${item.quantity}</td>
      <td style="padding: 10px 0; text-align: right; font-size: 14px;">₹${(item.priceAtPurchase * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"Decant Atelier Sales" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `🔔 New Order Received: ${order.orderReference || order.id}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1c1b18; margin-top: 0;">New Customer Order</h2>
        <p>A new order has been successfully placed on Decant Atelier.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        
        <h4 style="margin-bottom: 10px; color: #374151;">Order Summary</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
              <th style="padding-bottom: 8px; font-size: 12px; text-transform: uppercase; color: #6b7280;">Item</th>
              <th style="padding-bottom: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280;">Qty</th>
              <th style="padding-bottom: 8px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <table style="width: 100%; margin-top: 10px;">
          <tr>
            <td style="font-size: 14px; color: #4b5563;">Subtotal:</td>
            <td style="text-align: right; font-size: 14px;">₹${parseFloat(order.subtotal).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #4b5563;">Shipping Fee:</td>
            <td style="text-align: right; font-size: 14px;">₹${parseFloat(order.shippingFee).toLocaleString('en-IN')}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 16px; border-top: 1px solid #e5e7eb;">
            <td style="padding-top: 10px;">Total:</td>
            <td style="padding-top: 10px; text-align: right; color: #8b672f;">₹${parseFloat(order.total).toLocaleString('en-IN')}</td>
          </tr>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <h4 style="margin-bottom: 10px; color: #374151;">Customer & Delivery Details</h4>
        <table style="width: 100%; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="font-weight: bold; width: 120px; color: #6b7280;">Customer Name:</td>
            <td>${customerName}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #6b7280;">Method:</td>
            <td>${order.paymentMethod} / ${order.shippingMethod}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" style="background-color: #1c1b18; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 4px; display: inline-block;">Manage Order</a>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] New Order Alert email sent successfully: ${info.messageId}`);
  } catch (err) {
    console.error('[Email Service] Failed to send new order alert email:', err);
  }
}
