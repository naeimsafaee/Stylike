const {phone} = require("phone");
const {
    Manager,
    User,
    ManagerSession,
    UserDiamond,
    DiamondType,
    Diamond,
    Asset,
    UserWallet,
    UserNotification,
    UserCollection,
    Category,
    Role,
    Permission,
    ManagerNotification,
    ReferralReward,
    AgentReward,
    UserAssignedToken
} = require("../../databases/postgres");
const uuid = require("uuid");

const {HumanError, NotFoundError, NotAuthenticatedError, InvalidRequestError} = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const {password, jwt} = require("../../utils");
const Web3Token = require("web3-token");
const Web3 = require("web3");
const moment = require("moment");
const {postgres} = require("../../databases");

function throwError() {
    throw new NotAuthenticatedError(Errors.UNAUTHORIZED.CODE, Errors.UNAUTHORIZED.MESSAGE);
}

function emptyAddress() {
    throw new InvalidRequestError(Errors.EMPTY_ADDRESS.CODE, Errors.EMPTY_ADDRESS.MESSAGE);
}

function invalidAddress() {
    throw new InvalidRequestError(Errors.INVALID_ADDRESS.CODE, Errors.INVALID_ADDRESS.MESSAGE);
}

async function serializeUser(user, client = null) {
    if (!user) return;

    if (user.toObject) user = user.toObject();
    let followersCount = 0
    // await mongoose.model("userFollowLike").countFollowers(user._id);
    let followingCount = 0
    // await mongoose.model("userFollowLike").countFollowing(user._id);
    let following = 0
    // await mongoose.model("userFollowLike").isFollowing(client && client._id, user._id);
    let collectionsCount = 0
    // await mongoose.model("userCollections").countDocuments({ user: user._id, deletedAt: null });


    let assignedTokens = await UserAssignedToken.findAll({
        where: {
            userId: user.id,
            status: {
                [postgres.Op.in]: ['FREE', 'IN_AUCTION'],
            },
            deletedAt: null,
        },
        raw: true,
    });

    const tokenIds = 0
    // assignedTokens.map((at) => String(at.tokenId));
    const filtered = 0
    // assignedTokens.filter(({ tokenId }, index) => !tokenIds.includes(String(tokenId), index + 1));
    const _user = user.dataValues;

    return {
        ..._user,
        following,
        followersCount,
        followingCount,
        collectionsCount,
        // nftsCount: filtered.length,
        nftsCount: 0
    };
};

async function managerLogin(email, _password) {
    return new Promise(async (resolve, reject) => {
        const findObject = {};
        email = email.toLowerCase();
        findObject.email = email;
        const user = await Manager.findOne(findObject);
        if (!user)
            return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, findObject));

        const checkPassword = await password.validate(_password, user.salt, user.password);
        if (!checkPassword && findObject.email)
            return reject(
                new HumanError(Errors.EMAIL_AND_PASSWORD_INCORRECT.MESSAGE, Errors.EMAIL_AND_PASSWORD_INCORRECT.CODE),
            );

        // generate user auth token
        const _token = new jwt.Token(user.id, "manager");

        const refreshToken = _token.generateRefresh();

        const accessToken = _token.generateAccess();

        await ManagerSession.create({
            manager: user.id,
            accessToken,
            refreshToken,
            accessExpiresAt: _token.accessExpiresAt,
            refreshExpiresAt: _token.refreshExpiresAt,
        });

        resolve({
            refreshToken: {
                token: refreshToken,
                expiresAt: _token.refreshExpiresAt,
            },
            accessToken: {
                token: accessToken,
                expiresAt: _token.accessExpiresAt,
            },
        });
    });
}

async function userRegister(req, io) {

    const userId = req.userEntity.id;

    const address = req.body.address.toLowerCase();

    if (!address) {
        return emptyAddress();
    }

    const isAddressValid = Web3.utils.isAddress(address);
    if (!isAddressValid) {
        return invalidAddress();
    }

    let user = await postgres.User.findOne({where: {marketAddress: address}});

    if (!user)
        await postgres.User.update({marketAddress: address}, {where: {id: userId}});

    return user;
}

async function assignGhostCard(user) {
    let data = {
        isGhostModeEnabledNow: false,
        isGhostModeActive: false,
        isGhostModeLostNow: false,
        ghostExpiryDate: null,
        ghostDiamond: null,
    };

    const GhostType = await DiamondType.findOne({name: "Common"});

    if (GhostType) {
        const userCards = await UserDiamond.find({userId: user._id}).lean();

        if (userCards.length === 0) {
            //user has no card
            const freeGhostCard = await Diamond.findOne({diamondTypeId: GhostType._id});
            if (freeGhostCard) {
                // const transaction = await postgres.sequelize.transaction();

                try {
                    await UserDiamond.create({
                        userId: user._id,
                        diamondId: freeGhostCard._id,
                        status: "GIFT",
                    });

                    await UserNotification.create({
                        userId: user._id,
                        title: `Gift`,
                        description: `Congratulations! You have earn one common diamond as a gift `,
                    });
                    // await assignAttributes(user.id, freeGhostCard, transaction);

                    // await transaction.commit();
                    data.isGhostModeEnabledNow = true;

                } catch (e) {
                    // await transaction.rollback();
                    throw e;
                }
            }
        }

        const userGhostCards = await UserDiamond.findOne({
            userId: user._id,
            status: "GIFT",
            deletedAt: null,
        }).populate({path: "diamondId", match: {diamondTypeId: GhostType._id}});

        data.ghostDiamond = userGhostCards;

        if (userGhostCards && userGhostCards.diamondId) {
            const userNormalCards = await UserDiamond.find({
                userId: user._id,
            }).populate({path: "diamondId", match: {diamondTypeId: {$ne: GhostType._id}}});

            let userNormalCard = 0;
            for (let i = 0; i < userNormalCards.length; i++) {
                if (userNormalCards[i].diamondId) userNormalCard += 1;
            }

            let ghostExpiryDate = moment(userGhostCards.createdAt, "YYYY-MM-DD").add(20, "days");
            data.ghostExpiryDate = ghostExpiryDate.unix();

            if (ghostExpiryDate.isBefore() || userNormalCard > 0) {
                userGhostCards.deletedAt = new Date();
                await userGhostCards.save();
                data.isGhostModeLostNow = true;
            } else {
                data.isGhostModeActive = true;
            }
        }
    }

    return data;
}

async function addReferredCode(userId, data) {
    const {referredCode} = data;
    const user = await User.findOne({_id: userId});

    if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE);

    if (user.referredCode)
        throw new NotFoundError('you have already entered another code', 400);

    if (user.referralCode === referredCode)
        throw new NotFoundError('you can not use your own code', 400);

    if (referredCode) {
        const referredUser = await User.findOne({referralCode: referredCode});

        if (!referredUser) throw new HumanError("There is no user with current referred code.", 400);

        if (referredUser.level === "NORMAL") {
            const userCount = await User.countDocuments({referredCode});

            if (userCount >= referredUser.referralCodeCount) {
                throw new HumanError(
                    `This referral code already reaches it's maximum allowed usage number (${referredUser.referralCodeCount})`,
                    400,
                );
            }
        } else {
            await AgentReward.create({
                agentId: referredUser._id,
                userId: user._id,
                commission: 0,
            })
        }
        user.referredCode = referredCode;
        user.seenReferredModal = true;
        await user.save();

        const bnbAsset = await Asset.findOne({title: "BNB_SYSTEM"});
        await ReferralReward.create({
            assetId: bnbAsset._id,
            type: 'REGISTER',
            amount: 0,
            userId: referredUser._id,
            referredUserId: user._id,
        })
    }

    return "success";
}

async function seenGhostModal(user) {
    await User.findOneAndUpdate(
        {_id: user._id,},
        {$set: {seenGhostModal: true}},
    );
    return "success";
}

async function managerInfo(userId) {
    const user = await Manager.findOne({_id: userId})
        .populate({
            path: "roleId",
            select: "name nickName",
            populate: {path: "permissions", select: "name nickName"},
        })
        .select("email avatar roleId status isSuperadmin");

    return {data: user};
}

module.exports = {
    managerLogin,
    userRegister,
    assignGhostCard,
    managerInfo,
    addReferredCode,
    seenGhostModal,
    serializeUser
};
