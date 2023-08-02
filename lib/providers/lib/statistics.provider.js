

const hooks = require("../../hooks");
const { statisticService } = require("../../services");
const { events } = require("../../data/constans");

hooks.register(
	[events.users.add, events.withdraw.completed, events.deposit.add, events.income.add],
	"after",
	statisticService.init,
	1,
	true,
	true,
);

// hooks.register(events.users.add, "after", statisticService.updateNewUser, 2);

// hooks.register(events.withdraw.completed, "after", statisticService.updateWithdraw, 2);

// hooks.register(events.deposit.add, "after", statisticService.updateDeposit, 2);

// hooks.register(events.income.add, "after", statisticService.updateIncome, 3);
