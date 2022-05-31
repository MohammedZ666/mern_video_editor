/**
 * @file Manager for sending emails
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import { config, server } from '../config';
import log from './logger';
const nodemailer = require('nodemailer');

export default {

	sendProjectFinished(recipient, project, success) {
		const transporter = nodemailer.createTransport({
			host: config.emailServer,
			port: config.emailPort,
			secure: (config.emailPort === 465), // true for 465, false for other ports
			auth: {
				user: config.emailUser,
				pass: config.emailPasswd,
			},
			tls: {
				rejectUnauthorized: false // do not fail on invalid certs
			}
		});

		const projectLink = `${server.serverUrl}/project/${project}`;
		const videoLink = `${server.serverUrl}/project/${project}/finished`;

		const email = {
			from: '"Vladan Kudláč" <xkudla15@stud.fit.vutbr.cz>',
			to: recipient,
			subject: 'Video editor - Project completed', // Subject line
		};

		if (success) {
			email.html = `<p> The final video of your <a href="${projectLink}"> project </a> has just been completed. </p>
			<p> You can download it at the following link: <a href="${videoLink}"> $ {videoLink} </a> </p>
			<p> Code to embed video in the page: </p>
			<pre> & lt; video controls src = "$ {videoLink}" / & gt; </pre>`;
		}
		else {
			email.to += `, ${config.adminEmail}`;
			email.html = `<p> Your <a href="${projectLink}"> project </a> could not be processed. </p>
			<p> We apologize for the inconvenience, and we'll address this issue as soon as possible. </p>`;
		}

		transporter.sendMail(email, (err) => {
			if (err) log.error(`Email to ${recipient} (project ${project}) failed!`, err);
			else {
				log.info(`Email send to: "${recipient}"`);
			}
		});
	}
};
