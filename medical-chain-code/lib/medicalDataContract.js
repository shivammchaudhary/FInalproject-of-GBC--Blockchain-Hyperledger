const { Contract } = require('fabric-contract-api');
const fs = require('fs');
const path = require('path');

class MedicalDataContract extends Contract {
  async initLedger(ctx) {
    const collectionConfig = this.loadCollectionConfig(ctx);
    const data = [
      {
        id: '1',
        patientID: 'patient1',
        patientName: 'John Doe',
        diagnosis: 'Fever',
        medications: ['Medicine A', 'Medicine B'],
      },
      {
        id: '2',
        patientID: 'patient2',
        patientName: 'Jane Smith',
        diagnosis: 'Headache',
        medications: ['Medicine C', 'Medicine D'],
      },
    ];

    for (const item of data) {
      await ctx.stub.putPrivateData(collectionConfig.name, item.id, Buffer.from(JSON.stringify(item)));
    }
  }

  async getAllMedicalData(ctx) {
    const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
  }

  async getMedicalData(ctx, id) {
    const collectionConfig = this.loadCollectionConfig(ctx);
    const dataJSON = await ctx.stub.getPrivateData(collectionConfig.name, id);
    if (!dataJSON || dataJSON.length === 0) {
      throw new Error(`Medical data with ID ${id} does not exist.`);
    }
    const data = JSON.parse(dataJSON.toString());
    return data;
  }

  async getMedicalDataByPatientID(ctx, patientID) {
    const collectionConfig = this.loadCollectionConfig(ctx);
    const query = {
      selector: {
        patientID: patientID,
      },
    };
    const iterator = await ctx.stub.getPrivateDataQueryResult(collectionConfig.name, JSON.stringify(query));
    const results = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        const data = JSON.parse(res.value.value.toString('utf8'));
        results.push(data);
      }
      if (res.done) {
        await iterator.close();
        return results;
      }
    }
  }

  async createMedicalData(ctx, id, patientID, patientName, diagnosis, medications) {
    const collectionConfig = this.loadCollectionConfig(ctx);
    const data = {
      id,
      patientID,
      patientName,
      diagnosis,
      medications,
    };
    await ctx.stub.putPrivateData(collectionConfig.name, id, Buffer.from(JSON.stringify(data)));
  }

  async transferMedicalData(ctx, id) {
    const collectionConfig = this.loadCollectionConfig(ctx);
    const dataJSON = await ctx.stub.getPrivateData(collectionConfig.name, id);

    if (!dataJSON || dataJSON.length === 0) {
      throw new Error(`Medical data with ID ${id} does not exist.`);
    }

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(dataJSON)));
  }

  async deletePublicData(ctx, id) {
    await ctx.stub.deleteState(id);
  }


  loadCollectionConfig(ctx) {
    const mspID = ctx.stub.getMspID();
    const collectionConfigPath = path.join(__dirname, '..', 'collection_config.json');
    const collectionConfigContent = fs.readFileSync(collectionConfigPath, 'utf8');
    console.log(mspID);
    const collectionConfig = JSON.parse(collectionConfigContent);

    const collection = collectionConfig.find((config) => config.policy.includes(mspID));
    if (collection) {
      return collection;
    }
  }
  
}

module.exports = MedicalDataContract;
