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

export function checkAvatarFile(file, username)
{
	const MAX_FILE_SIZE = 2 * 1024 * 1024;

	if (file.size > MAX_FILE_SIZE) {
		window.app.showErrorMsg('#input-message', 'File size exceeds the 2MB limit');
		return false;
	}
	const allowed_extensions = ["jpg", "jpeg", "png"]
	const extension = file.name.split('.').pop();
	if (!allowed_extensions.includes(extension)) {
		window.app.showErrorMsg('#input-message', 'Avatar in jpg, jpeg, or png format only');
		return false;
	}
	const newFilename = `${username}.${extension}`;
	const modifiedFile = new File([file], newFilename, {
		type: file.type,
		lastModified: file.lastModified
	});
	return modifiedFile;
}

export function handleAvatarChange(event, file) {
	file = event.target.files[0];
	const avatar = document.getElementById('upload-avatar');
	if (file) {
		avatar.textContent = "Avatar selected: " + file.name;
	}
	return file;
}

export function refreshInputFields(handleAvatarChange) {
	const passwordInput = document.getElementById('password-input');
	const confirmPasswordInput = document.getElementById('confirm-password-input');
	const avatar = document.getElementById('upload-avatar');
	passwordInput.value = '';
	confirmPasswordInput.value = '';
	
	avatar.innerHTML = `
		<label for="avatar-input">
			<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload Avatar
		</label>
		<input type="file" id="avatar-input" accept="image/*" hidden>
	`;
	const avatarInput = document.getElementById('avatar-input');
	avatarInput.addEventListener('change', handleAvatarChange);
}