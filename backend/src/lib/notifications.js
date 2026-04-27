const { logger } = require('./logger');

const providers = {
  console: {
    send: async (to, subject, body) => {
      logger.info({ to, subject }, 'Notification sent (console provider)');
    },
  },
};

let activeProvider = providers.console;

function setProvider(name, provider) {
  providers[name] = provider;
  activeProvider = provider;
}

async function sendNotification(to, subject, body) {
  return activeProvider.send(to, subject, body);
}

async function notifyMembershipApproved(userEmail, userName, clubName) {
  return sendNotification(userEmail, 'Membership Approved', `Hello ${userName}, your membership to ${clubName} has been approved.`);
}

async function notifyMembershipRejected(userEmail, userName, clubName) {
  return sendNotification(userEmail, 'Membership Update', `Hello ${userName}, your membership request to ${clubName} has been declined.`);
}

async function notifyNewEvent(userEmails, eventTitle, clubName) {
  const promises = userEmails.map((email) =>
    sendNotification(email, `New Event: ${eventTitle}`, `${clubName} has created a new event: ${eventTitle}.`)
  );
  return Promise.allSettled(promises);
}

module.exports = {
  sendNotification,
  notifyMembershipApproved,
  notifyMembershipRejected,
  notifyNewEvent,
  setProvider,
};
