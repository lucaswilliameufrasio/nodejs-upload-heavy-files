let bytesAmount = 0;
let socketIoClientId = null;
const API_URL = "http://localhost:3000";
const ON_UPLOAD_EVENT = "file-uploaded";

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const updateStatus = (size) => {
  const text = `Pending Bytes to Upload: <strong>${formatBytes(size)}</strong>`;
  document.getElementById("size").innerHTML = text;
};

const showSize = () => {
  const { files: filesElements } = document.getElementById("file");
  if (!filesElements) return;
  const files = Array.from(filesElements);
  const { size } = files.reduce(
    (prev, next) => ({ size: prev.size + next.size }),
    {
      size: 0,
    }
  );

  bytesAmount = size;
  updateStatus(size);
};

const updateMessage = (message) => {
  const messageElement = document.getElementById("message");
  messageElement.hidden = false
  messageElement.innerHTML = message;

  messageElement.classList.add("alert", "alert-success");
  setTimeout(() => (messageElement.hidden = true), 3000);
};

const showMessage = () => {
  const successMessage = 'Files uploaded with success!';
  updateMessage(successMessage);
};

const resetForm = () => {
  const form = document.getElementById("form");
  form.reset()
}

const onSubmit = (event) => {
  event.preventDefault();
  const fileInputElement = document.getElementById("file");

  const formData = new FormData()
  for (let index = 0; index < fileInputElement.files.length; index++) {
    formData.append('file', fileInputElement.files[index])
  }

  const uploadURL = socketIoClientId ? API_URL + `?socketId=${socketIoClientId}` : API_URL

  fetch(uploadURL, {
    method: 'POST',
    body: formData
  }).then((response) => {
    console.log('Successfully uploaded', response)
    showMessage()
    resetForm()
  }).catch((error) => {
    console.error('Something went wrong', error)
  })
}

const configureForm = () => {
  const form = document.getElementById("form");
  form.onsubmit = onSubmit
};


const onload = () => {
  const ioClient = io.connect(API_URL, { withCredentials: false });
  ioClient.on("connect", (message) => {
    console.log("connected!", ioClient.id);
    socketIoClientId = ioClient.id
    configureForm();
  });

  ioClient.on(ON_UPLOAD_EVENT, (bytesReceived) => {
    console.log("received", bytesReceived);
    bytesAmount = bytesAmount - bytesReceived;
    updateStatus(bytesAmount);
  });
  updateStatus(0);
};

window.onload = onload;
window.showSize = showSize;
