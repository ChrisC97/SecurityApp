import { Component, OnInit } from '@angular/core';
import { File, Entry, FileEntry, IFile } from '@ionic-native/file/ngx';
import { Platform, AlertController, ToastController } from '@ionic/angular';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { Router, ActivatedRoute } from '@angular/router';
import { AES256 } from '@ionic-native/aes-256/ngx';
import { Zip } from '@ionic-native/zip/ngx';
var JSZip = require('jszip');
var CryptoJS = require("crypto-js");
//declare var require: any;
 
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements OnInit {
  directories = [];
  folder = '';
  copyFile: Entry = null;
  shouldMove = false;
  ROOT_DIRECTORY = 'file:///';
  secureIV: string = "AiGoePzlaswkK";

  // Info
  static archiveSelectionMode = false;
  static archiveFiles:Entry[] = [];
 
  constructor(
    private file: File,
    private plt: Platform,
    private alertCtrl: AlertController,
    private fileOpener: FileOpener,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private aes256: AES256,
    private zip: Zip
  ) { 
  }
 
  ArchiveModeCheck(){
    return HomePage.archiveSelectionMode;
  }

  CopyModeCheck(){
    return false;
  }

  ngOnInit() {
    this.folder = this.route.snapshot.paramMap.get('folder') || '';
    this.loadDocuments();
  }
 
  loadDocuments() {
    this.plt.ready().then(() => {
      // Reset for later copy/move operations
      this.copyFile = null;
      this.shouldMove = false;
      
      // Naviagate to the folder (root directory + the directory of the file/folder).
      this.file.listDir(this.ROOT_DIRECTORY, this.folder).then(res => {
        this.directories = res;
      });
    });
  }

  async createFolder() {
    let alert = await this.alertCtrl.create({
      header: 'Create folder',
      message: 'Please specify the name of the new folder',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'MyDir'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Create',
          handler: data => {
            this.file
              .createDir(
                `${this.ROOT_DIRECTORY}/${this.folder}`,
                data.name,
                false
              )
              .then(res => {
                this.loadDocuments();
              });
          }
        }
      ]
    });
   
    await alert.present();
  }
   
  async createFile() {
    let alert = await this.alertCtrl.create({
      header: 'Create file',
      message: 'Please specify the name of the new file',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'MyFile'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Create',
          handler: data => {
            this.file
              .writeFile(
                `${this.ROOT_DIRECTORY}/${this.folder}`,
                `${data.name}.txt`,
                `My custom text - ${new Date().getTime()}`
              )
              .then(res => {
                this.loadDocuments();
              });
          }
        }
      ]
    });
   
    await alert.present();
  }

  async CheckArchiveFiles(){
    let str:string = "";
    for(let v of HomePage.archiveFiles){
      str += v.fullPath + "\n";
    }

    let alert = await this.alertCtrl.create({
      header: 'Files Selected',
      message: str,
      buttons: [
        {
          text: 'Confirm'
        }
      ]
    });
   
    await alert.present();
  }

  async PrintMessage(str:string){
    let alert = await this.alertCtrl.create({
      header: 'Message',
      message: str,
      buttons: [
        {
          text: 'Confirm'
        }
      ]
    });
   
    await alert.present();
  }

  async EnterKey() {
    let alert = await this.alertCtrl.create({
      header: 'Enter Key',
      message: 'Please Enter your key',
      inputs: [
        {
          name: 'fname',
          type: 'text',
          placeholder: 'File Name'
        },
        {
          name: 'key',
          type: 'text',
          placeholder: 'Encryption Key'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Create',
          handler: data => {
            this.FinishArchiveSelection(data.fname, data.key);
          }
        }
      ]
    });
   
    await alert.present();
  }


  async DecryptFilesEnter(file:FileEntry) {
    let alert = await this.alertCtrl.create({
      header: 'Enter Key',
      message: 'Please Enter the key.',
      inputs: [
        {
          name: 'key',
          type: 'text',
          placeholder: 'Encryption Key'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Create',
          handler: data => {
            this.DecryptSelectedFile(file, data.key);
          }
        }
      ]
    });
   
    await alert.present();
  }

  deleteFile(file: Entry) {
    let path = this.ROOT_DIRECTORY + this.folder;
    this.file.removeFile(path, file.name).then(() => {
      this.loadDocuments();
    });
  }
   
  startCopy(file: Entry, moveFile = false) {
    this.copyFile = file;
    this.shouldMove = moveFile;
  }

  StartArchiveSelection(){
    HomePage.archiveSelectionMode = true;
    HomePage.archiveFiles = [];
  }
  
  HackFileReader(): FileReader {
    const preZoneFileReader = ((window as any).FileReader as any).__zone_symbol__OriginalDelegate;
    if (preZoneFileReader) {
      console.log('%cHackFileReader: preZoneFileReader found creating new instance', 'font-size:3em; color: red');
      return new preZoneFileReader();
    } else {
      console.log('%cHackFileReader: NO preZoneFileReader was found, returning regular File Reader', 'font-size:3em; color: red');
      return new FileReader();
    }
  }

  ab2str(buf:Uint8Array): string {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }  

  str2ab(str): ArrayBuffer {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
  

  async FinishArchiveSelection(finalFileName:string, secureKey: string){
    console.log("Finish start.");

    this.plt.ready().then(async () => {

     //var currentURL = await this.file.resolveDirectoryUrl(this.ROOT_DIRECTORY + "/" + this.folder);

      var zi = new JSZip();

      var self = this;

      // Iterate through each file.
      let fileLocations:string = "";
      for(let af of HomePage.archiveFiles){
        let fURL = await this.file.resolveDirectoryUrl(this.ROOT_DIRECTORY + af.fullPath.replace(af.name, '')); 
        let f:FileEntry = await this.file.getFile(fURL, af.name, { create: false });

        console.log(`Start of file ${f.name}`);

        // Get file data method.
        const readUploadedFileAsText = (fi:FileEntry) => 
        new Promise<ArrayBuffer>((resolve, reject) => {
          fi.file(function(file:IFile){
            let fileReader = self.HackFileReader();

            console.log("Start read");
            console.log(file);
            
            fileReader.onloadend = () => {console.log("On load end."); resolve(fileReader.result as ArrayBuffer);};
            fileReader.onerror = () => {console.log("Read error."); reject(fileReader.error)};

            fileReader.readAsArrayBuffer(file);
          },
          function(){
            reject("Problem getting file");
          });
        });

        // Get file data.
        let fileContents = await readUploadedFileAsText(f).catch(error => {
          console.log(`Error on read ${error}`);
        });
        console.log(`Got file ${f.name}`);
        console.log(fileContents);
        zi.file(f.name, (fileContents as ArrayBuffer));
        fileLocations += this.ROOT_DIRECTORY + af.fullPath + ":" + af.name + "\n";
        await this.file.removeFile(this.ROOT_DIRECTORY + af.fullPath.replace(af.name, ''), af.name);
      }

      console.log(`end of loop.`);

      // Write zip file to storage.
      console.log(JSZip.support);

      zi.generateAsync(
        {type:"blob", compression: "DEFLATE", compressionOptions: { level: 9 }, comment: fileLocations
      }).then(async function(content) {
        console.log("Hi.");

        console.log(content);

        //await self.file.removeFile(self.ROOT_DIRECTORY + "/" + self.folder, "example.zip");
        
        const readFileAsBase64 = (sBlob:Blob) => 
        new Promise<string>((resolve, reject) => {
          let fileReader = self.HackFileReader();

          console.log("Start read");
          
          fileReader.onloadend = () => {console.log("On load end."); resolve(fileReader.result as string);};
          fileReader.onerror = () => {console.log("Read error."); reject(fileReader.error)};

          fileReader.readAsDataURL(sBlob);
        });


        let contentsB64:string = await readFileAsBase64(content as Blob);

        let actualContent:string = contentsB64.split(",")[1];

        //let cAB = await new Response(content as Blob).text();

        //let encyContent = await self.aes256.encrypt(secureKey, self.secureIV, cAB);

        console.log("ORIGINAL (BASE64)");
        console.log(actualContent);

        let eencyContent = CryptoJS.AES.encrypt(actualContent, secureKey);
        let encyContent = eencyContent.toString();

        console.log("ENCRYPTED (BASE64)");
        console.log(encyContent);

        await self.file
        .writeFile(
          self.ROOT_DIRECTORY + "/" + self.folder,
          finalFileName+".saf",
          encyContent
        );

        HomePage.archiveSelectionMode = false;
        HomePage.archiveFiles = [];
        self.loadDocuments();
      });

    });
  }

  CancelArchiveSelection(){
    HomePage.archiveSelectionMode = false;
    HomePage.archiveFiles = [];
  }

  ToggleArchiveSelection(file: Entry){
    // If it's in the list, remove it.
    if(HomePage.archiveFiles.includes(file)){
      let index = HomePage.archiveFiles.indexOf(file);
      if(index > -1){
        HomePage.archiveFiles.splice(index, 1);
      }
    }else{
      // Not in the list, so add it.
      HomePage.archiveFiles.push(file);
    }
  }

  async DecryptSelectedFile(file:FileEntry, givenKey:string){
    let self = this;

    // Get file data method.
    const readUploadedFileAsText = (fi:FileEntry) => 
    new Promise<string>((resolve, reject) => {
      fi.file(function(file:IFile){
        let fileReader = self.HackFileReader();

        console.log("Start read");
        console.log(file);
        
        fileReader.onloadend = () => {console.log("On load end."); resolve(fileReader.result as string);};
        fileReader.onerror = () => {console.log("Read error."); reject(fileReader.error)};

        fileReader.readAsText(file);
      },
      function(){
        reject("Problem getting file");
      });
    });

    let fileContents = await readUploadedFileAsText(file).catch(error => {
      console.log(`Error on read ${error}`);
    });

    console.log("FILE CONTENTS");
    console.log(fileContents);

    let decryContent = CryptoJS.AES.decrypt(
      fileContents, 
      givenKey);

    console.log("DECRYPTED WORD");
    console.log(decryContent);

    if(decryContent == ""){
      // Wrong password.
      await this.PrintMessage("Wrong Password.");
    }else{      
      // RIGHT PASSWORD.
      console.log("DECRYPTED");
      let dcUTF = decryContent.toString(CryptoJS.enc.Utf8);
      console.log(dcUTF);

      var zi = new JSZip();

      // We have our zip result.
      let result = await zi.loadAsync(dcUTF, {base64: true});
      // Get the location each file should go.
      let fileLocations = result.comment;
      console.log(result.comment);


      Object.keys(result.files).forEach(function(filename){
        result.files[filename].async('text').then(async (fileContents) => {
          console.log(result.files[filename]);
          console.log(fileContents);
          await self.file
          .writeFile(
            self.ROOT_DIRECTORY + "/" + self.folder,
            filename,
            fileContents
          );
        });
      });

      let path = this.ROOT_DIRECTORY + this.folder;
      await this.file.removeFile(path, file.name);
    }
    self.loadDocuments();
  }

  CheckIfFileInArchiveList(file: Entry){
    return HomePage.archiveFiles.includes(file);
  }

  async itemClicked(file: FileEntry) {
    // We're in the mode where we select the files to archive.
    if (this.copyFile) {
      if (!file.isDirectory) {
        let toast = await this.toastCtrl.create({
          message: 'Please select a folder for your operation'
        });
        await toast.present();
        return;
      }
      // Finish the ongoing operation
      this.finishCopyFile(file);
  } else {
      if(file.name.includes(".saf")){
        this.DecryptFilesEnter(file);
      }else 
      // Open the file or folder
      if (file.isFile) {
        this.fileOpener.open(file.nativeURL, 'text/plain');
      } else {
        let pathToOpen =
          this.folder != '' ? this.folder + '/' + file.name : file.name;
        let folder = encodeURIComponent(pathToOpen);
        this.router.navigateByUrl(`/home/${folder}`);
      }
    }
  }
   
  finishCopyFile(file: Entry) {
    let path = this.ROOT_DIRECTORY + this.folder;
    let newPath = this.ROOT_DIRECTORY + this.folder + '/' + file.name;
   
    if (this.shouldMove) {
      if (this.copyFile.isDirectory) {
        this.file
          .moveDir(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      } else {
        this.file
          .moveFile(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      }
    } else {
      if (this.copyFile.isDirectory) {
        this.file
          .copyDir(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      } else {
        this.file
          .copyFile(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      }
    }
  }
}