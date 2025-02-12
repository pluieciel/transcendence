export async function addUserData(settings) {
	const	color = document.getElementById('color-span');
	const	quality = document.getElementById('quality-span');
	const	qualityLeftArrow = document.querySelector('#quality #selector-left-arrow');
	const	qualityRightArrow = document.querySelector('#quality #selector-right-arrow');
	const	colorIndex = settings.color;
	const	qualityIndex = settings.quality;
	
	let colorArray = {
		0: 'Blue',
		1: 'Cyan',
		2: 'Green',
		3: 'Orange',
		4: 'Pink',
		5: 'Purple',
		6: 'Red',
		7: 'Soft Green',
		8: 'White',
		9: 'Yellow',
	};
	let qualityArray = {
		0: 'Low',
		1: 'Medium',
		2: 'High',
	};

	qualityLeftArrow.disabled = qualityIndex == 0;
	qualityRightArrow.disabled = qualityIndex == 2;

	window.app.setColor(colorIndex);
	color.style.color = window.app.getColor(colorIndex);
	color.innerHTML = "<i class=\"fa-solid fa-fill-drip\"></i> " + colorArray[colorIndex];
	quality.innerHTML = "<i class=\"fa-solid fa-wrench\"></i> " + qualityArray[qualityIndex];
};

export async function eraseInDB() {
	try {
		const response = await fetch('/api/del/user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const data = await response.json();
		
		if (data.success)
			message(data.success, data.message);
		else
			// TODO: show error msg
		;
	} catch (error) {
		console.error('An error occurred: ', error);
		return false;
	}
}

export async function saveUserChanges(main, settings) {
	try {
		const response = await fetch('/api/settings/set/preferences', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				'newColor': settings.color,
				'newQuality': settings.quality,
			}),			
			});
			
		const data = await response.json();

		if (data.success) {
			window.app.settings.color = settings.color;
			window.app.settings.quality = settings.quality;
			if (!main)
				message(true, 'Theme and quality changes saved!');
			else
				window.app.router.navigateTo('/index');
		}
		else
			throw new Error(data['message']);
	}
	catch (e) {
		message(false, e);
	};
}

	
export function message(good, message) {
	let header = good ? "<i class=\"fa-solid fa-square-check\" style=\"color:green\"></i> Success !" : "<i class=\"fa-solid fa-square-xmark\" style=\"color:red\"></i> Failure.";
	new bootstrap.Modal(document.querySelector('#changeModal')).show();
	document.getElementById('modalFooter').classList.add("d-none");
	document.getElementById('modalHeader').innerHTML = header;
	document.getElementById('modalDialog').innerHTML = message;
}

export function message2(header, message) {
	new bootstrap.Modal(document.querySelector('#changeModal')).show();
	document.getElementById('modalFooter').classList.remove("d-none");
	document.getElementById('modalHeader').innerHTML = header;
	document.getElementById('modalDialog').innerHTML = message;
}
