import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as nodemailer from "nodemailer";

initializeApp();

const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

// ---------------------------------------------------------------------------
// Send email notification when a new territory is created (announced)
// ---------------------------------------------------------------------------

export const onTerritoryCreated = onDocumentCreated(
  {
    document: "territories/{territoryId}",
    secrets: [gmailEmail, gmailAppPassword],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("onTerritoryCreated: No data in event.");
      return;
    }

    const territory = snapshot.data();
    const territoryId = event.params.territoryId;

    // Guard: only send if emailNotificationSent is false
    if (territory.emailNotificationSent === true) {
      logger.info(
        `Territory ${territoryId}: email already sent, skipping.`
      );
      return;
    }

    const db = getFirestore();

    // Fetch assigned leader's email
    const leaderId = territory.assignedLeaderId;
    if (!leaderId) {
      logger.warn(
        `Territory ${territoryId}: no assignedLeaderId, skipping email.`
      );
      return;
    }

    const leaderDoc = await db.collection("users").doc(leaderId).get();
    if (!leaderDoc.exists) {
      logger.error(
        `Territory ${territoryId}: leader ${leaderId} not found in users collection.`
      );
      return;
    }

    const leader = leaderDoc.data()!;
    const recipientEmail = leader.email;

    if (!recipientEmail) {
      logger.error(
        `Territory ${territoryId}: leader ${leaderId} has no email.`
      );
      return;
    }

    // Build email content
    const territoryNumber = territory.number || "N/A";
    const territoryName = territory.name || "";
    const leaderName =
      territory.currentAssignment?.leaderName || leader.displayName || "Leader";
    const announcedByName = territory.announcedBy?.name || "Territory Servant";
    const description = territory.description || "No additional details.";

    // Format dates
    const announcedAt = territory.announcedAt?.toDate?.();
    const targetDate = territory.targetCompletionDate?.toDate?.();

    const announcedDateStr = announcedAt
      ? announcedAt.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    const targetDateStr = targetDate
      ? targetDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    // Nearest meeting place from the card metadata
    let meetingPlace = "See territory card for details";
    if (territory.card?.cardId) {
      const cardDoc = await db
        .collection("territoryCards")
        .doc(territory.card.cardId)
        .get();
      if (cardDoc.exists) {
        const cardData = cardDoc.data()!;
        meetingPlace =
          cardData.nearestMeetingPlace || "See territory card for details";
      }
    }

    const subject = `Territory Assignment: ${territoryNumber} — ${territoryName}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 8px;">
          Territory Assignment Notification
        </h2>

        <p>Dear <strong>${leaderName}</strong>,</p>

        <p>You have been assigned a new territory. Please review the details below:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold; width: 40%;">Territory Number</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${territoryNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">Territory Name</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${territoryName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">Meeting Place</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${meetingPlace}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">Announcement Date</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${announcedDateStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">Target Completion</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${targetDateStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">Assigned Leader</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${leaderName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">Announced By</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${announcedByName}</td>
          </tr>
        </table>

        ${description !== "No additional details." ? `<p><strong>Notes:</strong> ${description}</p>` : ""}

        <p>Please log in to the Monumento Territory Tracker to accept or review this assignment.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated notification from the Monumento Territory Tracker.
          Please do not reply to this email.
        </p>
      </div>
    `;

    const textBody = `
Territory Assignment Notification
==================================

Dear ${leaderName},

You have been assigned a new territory. Please review the details below:

Territory Number:    ${territoryNumber}
Territory Name:      ${territoryName}
Meeting Place:       ${meetingPlace}
Announcement Date:   ${announcedDateStr}
Target Completion:   ${targetDateStr}
Assigned Leader:     ${leaderName}
Announced By:        ${announcedByName}

${description !== "No additional details." ? `Notes: ${description}` : ""}

Please log in to the Monumento Territory Tracker to accept or review this assignment.

---
This is an automated notification from the Monumento Territory Tracker.
Please do not reply to this email.
    `.trim();

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail.value(),
        pass: gmailAppPassword.value(),
      },
    });

    try {
      await transporter.sendMail({
        from: `"Monumento Territory Tracker" <${gmailEmail.value()}>`,
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      logger.info(
        `Territory ${territoryId}: email sent to ${recipientEmail}`
      );

      // Mark email as sent to prevent duplicates
      await db.collection("territories").doc(territoryId).update({
        emailNotificationSent: true,
      });
    } catch (error) {
      logger.error(
        `Territory ${territoryId}: failed to send email to ${recipientEmail}`,
        error
      );
      // Do not rethrow — prevents infinite retry loop
    }
  }
);
