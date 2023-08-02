const SettingSeeder = require("../../databases/postgres/seeders/SettingSeeder");
const router = require("express").Router();


router.route('/seeder-setting').get(SettingSeeder.Handler)


module.exports = router