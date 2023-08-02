const {postgres} = require("../../");


exports.Handler = async function(req , res) {

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'ios_version',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'ios_version',
            'value': '1.0.0',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'ios_force_version',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'ios_force_version',
            'value': '1.0.0',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'ios_update_link',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'ios_update_link',
            'value': '1.0.0',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'android_version',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'android_version',
            'value': '1.1.1',
        }
    });


    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'android_force_version',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'android_force_version',
            'value': '1.1.1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'android_update_link',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'android_update_link',
            'value': '1.1.1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'APP_DETAIL',
            'key': 'android_update_link',
        },
        defaults: {
            'type': 'APP_DETAIL',
            'key': 'android_update_link',
            'value': '1.1.1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'USDT->STYL',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'USDT->STYL',
            'value': 'min=50-max=2000-fee=5-chainId=1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'STYL->USDT',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'STYL->USDT',
            'value': 'min=50-max=2000-fee=5-chainId=1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BNB->STYL',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BNB->STYL',
            'value': 'min=0.1-max=10-fee=5-chainId=1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'STYL->BNB',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'STYL->BNB',
            'value': 'min=1000-max=2000000-fee=5-chainId=1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'USDT->BNB',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'USDT->BNB',
            'value': 'min=50-max=2000-fee=5-chainId=1',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BNB->USDT',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BNB->USDT',
            'value': 'min=0.1-max=10-fee=5-chainId=1-rate=333.45',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BNB->BUSD',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BNB->BUSD',
            'value': 'min=0.1-max=10-fee=5-chainId=56-rate=258.97',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BUSD->BNB',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BUSD->BNB',
            'value': 'min=50-max=2000-fee=5-chainId=56',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BUSD->STL',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BUSD->STL',
            'value': 'rate=1-min=2000-max=10000',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'STL->BUSD',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'STL->BUSD',
            'value': 'rate=1-min=14-max=356-fee=6',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BUSD->STYL',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BUSD->STYL',
            'value': 'min=50-max=2000-fee=5-chainId=56',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'STYL->BUSD',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'STYL->BUSD',
            'value': 'min=1000-max=2000000-fee=5-chainId=56',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'BUSD->USDT',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'BUSD->USDT',
            'value': 'min=50-max=2000-fee=5-chainId=56',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'SWAP',
            'key': 'USDT->BUSD',
        },
        defaults: {
            'type': 'SWAP',
            'key': 'USDT->BUSD',
            'value': 'min=50-max=2000-fee=5-chainId=56',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'MAINTENANCE',
            'key': 'android',
        },
        defaults: {
            'type': 'MAINTENANCE',
            'key': 'android',
            'value': 'false',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'MAINTENANCE',
            'key': 'ios',
        },
        defaults: {
            'type': 'MAINTENANCE',
            'key': 'ios',
            'value': 'false',
        }
    });

    await postgres.Settings.findOrCreate({
        where: {
            'type': 'MAINTENANCE',
            'key': 'site',
        },
        defaults: {
            'type': 'MAINTENANCE',
            'key': 'site',
            'value': 'false',
        }
    });

    return res.send('ok');
}















