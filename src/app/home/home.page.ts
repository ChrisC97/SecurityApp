import { Component, OnInit } from '@angular/core';
import { File, Entry } from '@ionic-native/file/ngx';
import { Platform, AlertController, ToastController } from '@ionic/angular';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { Router, ActivatedRoute } from '@angular/router';
import {archiver} from 'archiver';
import { faSdCard } from '@fortawesome/free-solid-svg-icons';

import { FileDef } from '../interfaces/filedef';
 
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
                `${this.file.dataDirectory}/${this.folder}`,
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
                `${this.file.dataDirectory}/${this.folder}`,
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

  deleteFile(file: Entry) {
    let path = this.file.dataDirectory + this.folder;
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

  async FinishArchiveSelection(){
    HomePage.archiveSelectionMode = false;

    // Iterate through each file.
    for(let af of HomePage.archiveFiles){
      let f = await this.file.resolveDirectoryUrl(af.fullPath.replace(af.name, ''));
      this.file.getFile(f, af.name, { create: false });
    }

    HomePage.archiveFiles = [];
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
    let path = this.file.dataDirectory + this.folder;
    let newPath = this.file.dataDirectory + this.folder + '/' + file.name;
   
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