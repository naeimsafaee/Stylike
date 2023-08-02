

const hooks = require("../../hooks");
const { notificationServices } = require("../../services");
const { events } = require("../../data/constans");

hooks.register([events.users.add, events.withdraw.add], "after", notificationServices.addEvent, 20);

hooks.register([events.withdraw.completed, events.deposit.add], "after", notificationServices.addUserEvent, 20);

hooks.register([events.withdraw.reject], "after", notificationServices.addRejectEvent, 20);

hooks.register([events.card.purchase], "after", notificationServices.addUserEvent, 20);
