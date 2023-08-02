const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidV4 } = require("uuid");
const {Readable} = require("stream");
const awsConfigs = require("config").get("files.S3");

AWS.config.update({
	accessKeyId: awsConfigs.accessKeyId,
	secretAccessKey: awsConfigs.secretAccessKey,
});

const s3Config = new AWS.S3({
	signatureVersion: "v4",
});

let key = function (file, mainDirectory) {
	const fileName = getUniqFileName(file.originalname);
	const s3InnerDirectory = `${mainDirectory}/images`;
	const finalPath = `${s3InnerDirectory}/${fileName}`;

	return { path: finalPath, newName: fileName };
};

const isAllowedMimetype = (mime) =>
	[
		"image/png",
		"image/jpg",
		"image/jpeg",
		"image/gif",
		"image/x-ms-bmp",
		"image/webp",
		"audio/aac",
		"video/mp4",
		"video/webm",
		"application/pdf",
		"application/zip",
	].includes(mime.toString());

let fileDirectory;
let fileSize;

const fileFilter = (req, file, cb) => {
	const fileMime = file.mimetype;
	if (isAllowedMimetype(fileMime)) {
		const fileType = file.mimetype.split("/")[0];
		switch (fileType) {
			case "image":
				fileDirectory = awsConfigs.directories.images;
				fileSize = 1024 * 1024 * awsConfigs.maxFileSizeMB.images;
				break;
			case "audio":
				fileDirectory = awsConfigs.directories.audios;
				fileSize = 1024 * 1024 * awsConfigs.maxFileSizeMB.audios;
				break;
			case "video":
				fileDirectory = awsConfigs.directories.videos;
				fileSize = 1024 * 1024 * awsConfigs.maxFileSizeMB.videos;
				break;
			case "application":
				fileDirectory = awsConfigs.directories.application;
				fileSize = 1024 * 1024 * awsConfigs.maxFileSizeMB.application;
				break;
		}
		cb(null, true);
	} else {
		cb(null, false);
	}
};

const getUniqFileName = (originalname) => {
	const name = uuidV4();
	const ext = originalname.split(".").pop();

	return `${name}.${ext}`;
};

const multerS3Config = (mainDirectory) =>
	multerS3({
		s3: s3Config,
		bucket: awsConfigs.bucket,
		acl: "public-read",
		contentType: multerS3.AUTO_CONTENT_TYPE,
		key: function (req, file, cb) {
			const fileName = getUniqFileName(file.originalname);
			const s3InnerDirectory = `${mainDirectory}/${fileDirectory}`;
			const finalPath = `${s3InnerDirectory}/${fileName}`;
			file.newName = fileName;
			cb(null, finalPath);
		},
	});

const upload = (mainDirectory) =>
	multer({
		storage: multerS3Config(mainDirectory),
		fileFilter: fileFilter,
		limits: {
			fileSize,
		},
	});

exports.NftImageUpload = (req, res, next) => {
	try {
		let file = req?.files?.previewImage?.[0];

		const stream = Readable.from(file?.buffer);

		req.files.previewImageBuffer = file?.buffer;

		let { path, newName } = key(file, "nft");

		var params = {
			Bucket: awsConfigs.bucket,
			Key: path,
			ACL: "public-read",
			CacheControl: null,
			ContentType: file.mimetype,
			Metadata: null,
			StorageClass: "STANDARD",
			ServerSideEncryption: null,
			SSEKMSKeyId: null,
			Body: stream,
		};

		var upload = s3Config.upload(params);

		let currentSize;

		upload.on("httpUploadProgress", function (ev) {
			if (ev.total) currentSize = ev.total;
		});

		upload.send(
			function (err, result) {
				if (err) return next(err);
				this.files.previewImage = {
					size: currentSize,
					bucket: params.Bucket,
					key: params.Key,
					acl: params.ACL,
					contentType: params.ContentType,
					contentDisposition: params.ContentDisposition,
					contentEncoding: params.ContentEncoding,
					storageClass: params.StorageClass,
					serverSideEncryption: params.ServerSideEncryption,
					metadata: params.Metadata,
					location: result.Location,
					etag: result.ETag,
					versionId: result.VersionId,
					newName,
				};
				return next();
			}.bind(req),
		);
	} catch (err) {
		return res.status(402).json({ err: "Please upload preview" });
	}
};

exports.MainNftFileUpload = async (req, res, next) => {
	try {
		const mainFile = req?.files?.nftFile?.[0];
		if (!mainFile) {
			return next((err = "Please upload a nft file"));
		}

		const previewFile = req?.files?.previewImage?.[0];
		if (!previewFile) {
			return next((err = "Please upload a preview"));
		}

		const previewFileStream = Readable.from(previewFile?.buffer);
		const mainFileStream = Readable.from(mainFile?.buffer);

		req.files.previewImageBuffer = previewFile?.buffer;

		const { path: mainFilePath, newName: mainFileNewName } = key(mainFile, "nft-main");
		const { path: previewFilePath, newName: previewFileNewName } = key(previewFile, "nft-previews");

		const params = [
			{
				name: mainFileNewName,
				s3: {
					Bucket: awsConfigs.bucket,
					Key: mainFilePath,
					ACL: "public-read",
					CacheControl: null,
					ContentType: mainFile.mimetype,
					Metadata: null,
					StorageClass: "STANDARD",
					ServerSideEncryption: null,
					SSEKMSKeyId: null,
					Body: mainFileStream,
				},
			},
			{
				name: previewFileNewName,
				s3: {
					Bucket: awsConfigs.bucket,
					Key: previewFilePath,
					ACL: "public-read",
					CacheControl: null,
					ContentType: previewFile.mimetype,
					Metadata: null,
					StorageClass: "STANDARD",
					ServerSideEncryption: null,
					SSEKMSKeyId: null,
					Body: previewFileStream,
				},
			},
		];

		const responses = await Promise.all(params.map((param) => s3Config.upload(param.s3).promise()));

		responses.map((s3Reponse) => {
			if (s3Reponse.Location.includes("nft-previews"))
				req.files.previewImage = {
					...previewFile,
					location: s3Reponse.Location,
					key: s3Reponse.Key,
					newName: s3Reponse.Key.split("/")[s3Reponse.Key.split("/").length - 1],
				};

			if (s3Reponse.Location.includes("nft-main"))
				req.files.nftMainFile = {
					...mainFile,
					location: s3Reponse.Location,
					key: s3Reponse.Key,
					newName: s3Reponse.Key.split("/")[s3Reponse.Key.split("/").length - 1],
				};
		});

		return next();
	} catch (err) {
		console.log({err})
		return res.status(402).json({ err });
	}
};


// USING
exports.paymentPartner = upload("game-payment-icon");

exports.publicUpload = upload("game-public");

exports.avatarUpload = upload("avatar");

exports.blogUpload = upload("game-blog");

exports.categoryImageUpload = upload("game-category");

exports.languageUpload = upload("game-language");

exports.gameCardUpload = upload("game-card");

exports.gameCompetitionUpload = upload("game-competition");

exports.gameBundleUpload = upload("game-bundle");

exports.ticketUpload = upload("Ticket");

exports.badgeUpload = upload("Badge");

exports.cardUploader = upload("cards");

exports.algoTrexPlanUpload = upload("AlgoTrex-plan");

exports.matchParticipant = upload("match-participant");

exports.cardTypeUpload = upload("Card-Type");

exports.competitionTaskUpload = upload("competition-task");

exports.attributeUpload = upload("attributes");

exports.userPostUpload = upload("UserPost");

exports.aiUpload = upload("AI");

exports.UploadPhoto = upload("kyc");

exports.userCollectionImageUpload = upload("collection");

