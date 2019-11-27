import { Component, OnInit } from '@angular/core';
import { File, Entry, FileEntry, IFile } from '@ionic-native/file/ngx';
import { Platform, AlertController, ToastController } from '@ionic/angular';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { Router, ActivatedRoute } from '@angular/router';
declare var require: any;
 
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
    private toastCtrl: ToastController
  ) {}
 
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
          name: 'key',
          type: 'text',
          placeholder: ''
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
            this.FinishArchiveSelection(data.key);
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

  async FinishArchiveSelection(secureKey: string){
    console.log("Finish start.");

    let currentURL = await this.file.resolveDirectoryUrl(this.ROOT_DIRECTORY + "/" + this.folder);

    var JSZip = require("jszip");
    let zip = new JSZip();

    let self = this;

    // Iterate through each file.
    for(let af of HomePage.archiveFiles){
      let fURL = await this.file.resolveDirectoryUrl(this.ROOT_DIRECTORY + af.fullPath.replace(af.name, '')); 
      let f:FileEntry = await this.file.getFile(fURL, af.name, { create: false });

      console.log(`Start of file ${f.name}`);

      // Get file data method.
      const readUploadedFileAsText = (fi:FileEntry) => 
      new Promise<Blob>((resolve, reject) => {
        fi.file(function(file:IFile){
          let fileReader = self.HackFileReader();

          console.log("Start read");
          console.log(file);

          fileReader.onloadend = () => {console.log("On load end."); resolve( new Blob([fileReader.result], { type: file.type }) );};
          //fileReader.onloadend = () => {console.log("On load end."); resolve(fileReader.result)};
          fileReader.onerror = () => {console.log("Read error."); reject(fileReader.error)};

          fileReader.readAsBinaryString(file);
        },
        function(){
          reject("Problem getting file");
        });
      });

      // Get file data.
      let fileContents = await readUploadedFileAsText(f).catch(error => {
        console.log(`Error on read ${error}`);
      });
      zip.file(f.name, (fileContents as Blob));
    }

    console.log(`end of loop.`);

    // Write zip file to storage.
    console.log(JSZip.support);

    zip.generateAsync({type:"blob"}).then(async function(content) {
      console.log("Hi.");

      await self.file.removeFile(self.ROOT_DIRECTORY + "/" + self.folder, "example.zip");

      await self.file
      .writeFile(
        self.ROOT_DIRECTORY + "/" + self.folder,
        "example.zip",
        content
      );
    });

    HomePage.archiveSelectionMode = false;
    HomePage.archiveFiles = [];
    self.loadDocuments();
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

  CheckIfFileInArchiveList(file: Entry){
    return HomePage.archiveFiles.includes(file);
  }

  async itemClicked(file: Entry) {
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