import * as Yup from 'yup';

import User from '../models/User';

// TODO: Implement routines to validate/save avatar_id
class UserController {
  async store(req, res) {
    // TODO Implement personalized validation messages
    const schema = Yup.object().shape(
      {
        name: Yup.string().strict(true).required(),
        email: Yup.string().email().strict(true).required(),
        password: Yup.string().strict(true).required().min(6),
      },
    );

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const userExists = await User.findOne({ where: { email: req.body.email } });

    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const {
      id,
      name,
      email,
      provider,
    } = await User.create(req.body);

    return res.json({
      id,
      name,
      email,
      provider,
    });
  }

  async update(req, res) {
    // TODO Implement personalized validation messages
    const schema = Yup.object().shape(
      {
        name: Yup.string().strict(true),
        email: Yup.string().email().strict(true),
        password: Yup.string().min(6).strict(true),
        oldPassword: Yup.string().strict(true).min(6)
          .when('password', (password, field) => (
            password ? field.required() : field
          )),
        confirmPassword: Yup.string().strict(true)
          .when('password', (password, field) => (
            password ? field.required().oneOf([Yup.ref('password')]) : field)),
      },
    );

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { email, oldPassword, password } = req.body;

    const user = await User.findByPk(req.userId);

    if (email && email !== user.email) {
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(400).json({ error: 'User already exists' });
      }
    }

    if (password && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: 'Password does not match' });
    }

    const { id, name, provider } = await user.update(req.body);

    return res.json({ id, name, provider });
  }
}

export default new UserController();