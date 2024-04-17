const express = require('express');
const db = require('../database');

//import { ObjectId } from 'mongodb';

const router = express.Router();

router.get('/', async (req, res) => {
    const collection = await db.collection('users');
    const results = await collection.find({}).toArray();
    res.send(results).status(200);
});

router.get('/:username'), async (req, res) => {
    const collection = await db.collection('users');
    const query = { username: req.params.username };
    const result = await collection.findOne(query);

    if (!result) {
        res.send('Not found').status(404);
    } else {
        res.send(result).status(200);
    }
};

router.post('/', async (req, res) => {
    try {
        const newDocument = {
            username: req.body.username,
            password: req.body.password
        }

        const collection = await db.collection('users');
        const result = await collection.insertOne(newDocument);
        res.send(result).status(204);
    } catch (e) {
        console.error(`Error. ${e}`);
        res.status(500).send('Error adding record.');
    }
});

router.patch('/:username', async (req, res)=> {
    try {
        const query = { username: req.params.username };
        const updates = {
            $set: {
                username: username,
                password: password
            }
        };

        const collection = await db.collection('users');
        const result = await collection.updateOne(query, updates);
        res.send(result).status(200);
    } catch (e) {
        console.error( `Error: ${e}`);
        res.status(500).send('Error updating record.');
    }
});

router.delete('/:username', async (req, res) => {
    try {
    const query = { username: req.params.username };

    const collection = await db.collection('users');
    const result = await collection.deleteOne(query);
    
    res.send(result).status(200);
    } catch (e) {
        console.error(`Error: ${e}`);
        res.status(500).send('Error deleting record.'); 
    }
});

module.exports = router;