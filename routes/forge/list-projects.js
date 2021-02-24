const express = require('express');
const axios = require('axios');
const { HubsApi, ProjectsApi, FoldersApi, ItemsApi } = require('forge-apis');

let router = express.Router();

const { OAuth, getPublicTokenTwoLegged } = require('./common/oauth');

const WSP_HUB_ID = 'b.8a331102-468b-4ecd-a5c3-64c7b5c855ab';

// GET api/forge/list-projects, lists all projects from BIM360 hub
router.get('/', async (req, res, next) => {
  const token = await getPublicTokenTwoLegged();

  try {
    const result = await axios.get(
      `https://developer.api.autodesk.com/project/v1/hubs/${WSP_HUB_ID}/projects`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      }
    );

    allProjects = result.data.data;
    console.log(allProjects);

    const projectList = [];
    allProjects.forEach((project) => {
      projectList.push({
        project_id: project.id,
        name: project.attributes.name,
        root_folder: project.relationships.rootFolder.data.id,
      });
    });
    res.json(projectList);
  } catch (err) {
    next(err);
  }
});

router.get('/models', async (req, res, next) => {
  const token = await getPublicTokenTwoLegged();

  const projectId = 'b.9b6aae89-1b3a-4062-b7f2-9474b3478cde';
  const folderId = 'urn:adsk.wipprod:fs.folder:co.1u1Lf1cmSvy8vDjY1dhAkA';

  try {
    const result = await axios.get(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      }
    );

    const foldersList = result.data.data;

    foldersList.forEach((folder) => {
      if (folder.attributes.objectCount > 0) {
        console.log(folder);
        getSubFolders(projectId, folder.id, token.access_token);
      }
    });
    res.json(foldersList);
  } catch (err) {
    next(err);
  }
});

const getSubFolders = async (projectId, folderId, access_token) => {
  try {
    const result = await axios.get(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    console.log(result.data.data);
    return result.data.data;
  } catch (err) {
    console.error(err);
  }
};

router.get('/all', async (req, res) => {
  const href = decodeURIComponent(req.query.id);

  console.log(req.query);
  console.log(href);

  if (href === '') {
    res.status(500).end();
    return;
  }

  // Get the access token
  const oauth = new OAuth(req.session);
  const internalToken = await oauth.getInternalToken();

  if (href === '#') {
    getHubs(oauth.getClient(), internalToken, res);
  } else {
    const params = href.split('/');
    const resourceName = params[params.length - 2];
    const resourceId = params[params.length - 1];
    switch (resourceName) {
      case 'hubs':
        getProjects(resourceId, oauth.getClient(), internalToken, res);
        break;
      case 'projects':
        // For a project, first we need the top/root folder
        const hubId = params[params.length - 3];
        getFolders(
          hubId,
          resourceId /*project_id*/,
          oauth.getClient(),
          internalToken,
          res
        );
        break;
      case 'folders': {
        const projectId = params[params.length - 3];
        getFolderContents(
          projectId,
          resourceId /*folder_id*/,
          oauth.getClient(),
          internalToken,
          res
        );
        break;
      }

      case 'items': {
        const projectId = params[params.length - 3];
        getVersions(
          projectId,
          resourceId /*item_id*/,
          oauth.getClient(),
          internalToken,
          res
        );
        break;
      }
    }
  }
});

async function getHubs(oauthClient, credentials, res) {
  const hubs = new HubsApi();
  const result = await hubs.getHubs({}, oauthClient, credentials);
  res.json(
    result.body.data.map((hub) => {
      let hubType;
      switch (hub.attributes.extension.type) {
        case 'hubs:autodesk.core:Hub':
          hubType = 'hubs';
          break;
        case 'hubs:autodesk.a360:PersonalHub':
          hubType = 'personalHub';
          break;
        case 'hubs:autodesk.bim360:Account':
          hubType = 'bim360Hubs';
          break;
      }
      return createOutput(
        hub.links.self.href,
        hub.attributes.name,
        hubType,
        true
      );
    })
  );
}

async function getProjects(hubId, oauthClient, credentials, res) {
  const projects = new ProjectsApi();
  const data = await projects.getHubProjects(
    hubId,
    {},
    oauthClient,
    credentials
  );
  res.json(
    data.body.data.map((project) => {
      let projectType = 'projects';
      switch (project.attributes.extension.type) {
        case 'projects:autodesk.core:Project':
          projectType = 'a360projects';
          break;
        case 'projects:autodesk.bim360:Project':
          projectType = 'bim360projects';
          break;
      }
      return createOutput(
        project.links.self.href,
        project.attributes.name,
        projectType,
        true
      );
    })
  );
}

async function getFolders(hubId, projectId, oauthClient, credentials, res) {
  const projects = new ProjectsApi();
  const folders = await projects.getProjectTopFolders(
    hubId,
    projectId,
    oauthClient,
    credentials
  );
  res.json(
    folders.body.data.map((item) => {
      return createOutput(
        item.links.self.href,
        item.attributes.displayName == null
          ? item.attributes.name
          : item.attributes.displayName,
        item.type,
        true
      );
    })
  );
}

async function getFolderContents(
  projectId,
  folderId,
  oauthClient,
  credentials,
  res
) {
  const folders = new FoldersApi();
  const contents = await folders.getFolderContents(
    projectId,
    folderId,
    {},
    oauthClient,
    credentials
  );
  const treeNodes = contents.body.data.map((item) => {
    var name =
      item.attributes.name == null
        ? item.attributes.displayName
        : item.attributes.name;
    if (name !== '') {
      // BIM 360 Items with no displayName also don't have storage, so not file to transfer
      return createOutput(item.links.self.href, name, item.type, true);
    } else {
      return null;
    }
  });
  res.json(treeNodes.filter((node) => node !== null));
}

async function getVersions(projectId, itemId, oauthClient, credentials, res) {
  const items = new ItemsApi();
  const versions = await items.getItemVersions(
    projectId,
    itemId,
    {},
    oauthClient,
    credentials
  );
  res.json(
    versions.body.data.map((version) => {
      const dateFormated = new Date(
        version.attributes.lastModifiedTime
      ).toLocaleString();
      const versionst = version.id.match(/^(.*)\?version=(\d+)$/)[2];
      const viewerUrn =
        version.relationships != null &&
        version.relationships.derivatives != null
          ? version.relationships.derivatives.data.id
          : null;
      return createOutput(
        viewerUrn,
        decodeURI(
          'v' +
            versionst +
            ': ' +
            dateFormated +
            ' by ' +
            version.attributes.lastModifiedUserName
        ),
        viewerUrn != null ? 'versions' : 'unsupported',
        false
      );
    })
  );
}

function createOutput(_id, _name, _type, _children) {
  return {
    id: _id,
    name: _name,
    type: _type,
    children: _children,
  };
}
module.exports = router;
